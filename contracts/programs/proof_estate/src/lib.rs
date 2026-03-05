use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount, Transfer},
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// ------------------------------------------------------------------
// Space constants
// ------------------------------------------------------------------
// Discriminator: 8 bytes
// Pubkey:        32 bytes
// String prefix: 4 bytes  (each String needs 4-byte length prefix)
// We cap property_id at 64 chars, metadata_hash at 64, metadata_uri at 200
const PROPERTY_ACCOUNT_SPACE: usize = 8   // discriminator
    + 32                                   // owner: Pubkey
    + (4 + 64)                             // property_id: String  (max 64 chars)
    + (4 + 64)                             // metadata_hash: String
    + (4 + 200)                            // metadata_uri: String (max 200 chars)
    + 1                                    // status: u8 enum
    + 8                                    // timestamp: i64
    + (4 + 64)                             // token_mint: Option<Pubkey> stored as String-encoded or 1+32
    + 8;                                   // total_supply: u64

// Verifier: discriminator + authority pubkey
const VERIFIER_SPACE: usize = 8 + 32;

// ------------------------------------------------------------------
// Program
// ------------------------------------------------------------------
#[program]
pub mod proof_estate {
    use super::*;

    /// Register a government verifier. Only callable once per authority key.
    pub fn initialize_verifier(ctx: Context<InitializeVerifier>) -> Result<()> {
        let verifier = &mut ctx.accounts.verifier;
        verifier.authority = ctx.accounts.authority.key();
        msg!(
            "Verifier PDA created for authority {}",
            ctx.accounts.authority.key()
        );
        Ok(())
    }

    /// Property owner submits a property for verification.
    /// Stores the SHA-256 hash of the title deed and an IPFS/Arweave URI.
    pub fn initialize_property(
        ctx: Context<InitializeProperty>,
        property_id: String,
        metadata_hash: String,
        metadata_uri: String,
    ) -> Result<()> {
        require!(property_id.len() <= 64, PropertyError::StringTooLong);
        require!(metadata_hash.len() <= 64, PropertyError::StringTooLong);
        require!(metadata_uri.len() <= 200, PropertyError::StringTooLong);

        let property = &mut ctx.accounts.property_account;
        property.owner = ctx.accounts.owner.key();
        property.property_id = property_id;
        property.metadata_hash = metadata_hash;
        property.metadata_uri = metadata_uri;
        property.status = PropertyStatus::PendingVerification;
        property.timestamp = Clock::get()?.unix_timestamp;
        property.token_mint = None;
        property.total_supply = 0;

        msg!(
            "Property '{}' initialised by {}",
            property.property_id,
            property.owner
        );
        Ok(())
    }

    /// A registered verifier approves (or rejects) a pending property.
    /// The verifier PDA is loaded and its stored `authority` must match the signer.
    pub fn verify_property(ctx: Context<VerifyProperty>, approved: bool) -> Result<()> {
        // Verifier PDA is validated in the Accounts struct; signer == verifier.authority
        let property = &mut ctx.accounts.property_account;
        require!(
            property.status == PropertyStatus::PendingVerification,
            PropertyError::InvalidStatus
        );

        if approved {
            property.status = PropertyStatus::Verified;
            msg!("Property '{}' APPROVED by verifier", property.property_id);
        } else {
            property.status = PropertyStatus::Rejected;
            msg!("Property '{}' REJECTED by verifier", property.property_id);
        }
        property.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Tokenize a verified property — mints `total_supply` SPL tokens to the
    /// owner's associated token account.  The property PDA is the mint authority,
    /// ensuring no further minting can occur without another on-chain instruction.
    pub fn tokenize_property(
        ctx: Context<TokenizeProperty>,
        total_supply: u64,
    ) -> Result<()> {
        require!(total_supply > 0, PropertyError::InvalidSupply);

        {
            let property = &ctx.accounts.property_account;
            require!(
                property.status == PropertyStatus::Verified,
                PropertyError::NotVerified
            );
            require!(property.token_mint.is_none(), PropertyError::AlreadyTokenized);
        }

        // Build PDA signer seeds
        let property_id_bytes = ctx.accounts.property_account.property_id.clone();
        let property_id_ref = property_id_bytes.as_bytes();
        let bump = ctx.bumps.property_account;
        let seeds: &[&[u8]] = &[b"property", property_id_ref, &[bump]];
        let signer_seeds = &[seeds];

        // Mint total_supply tokens to owner's ATA
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.property_account.to_account_info(),
                },
                signer_seeds,
            ),
            total_supply,
        )?;

        let property = &mut ctx.accounts.property_account;
        property.status = PropertyStatus::Tokenized;
        property.token_mint = Some(ctx.accounts.token_mint.key());
        property.total_supply = total_supply;
        property.timestamp = Clock::get()?.unix_timestamp;

        msg!(
            "Property '{}' tokenised — mint: {}, supply: {}",
            property.property_id,
            ctx.accounts.token_mint.key(),
            total_supply
        );
        Ok(())
    }

    /// Deposit USDC rental income into the per-property rent vault PDA.
    /// Anyone (tenant, backend, DAO) can call this to fund the vault.
    pub fn deposit_rent(ctx: Context<DepositRent>, amount: u64) -> Result<()> {
        require!(amount > 0, PropertyError::InvalidAmount);
        require!(
            ctx.accounts.property_account.status == PropertyStatus::Tokenized,
            PropertyError::NotTokenized
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_usdc_account.to_account_info(),
                    to: ctx.accounts.rent_vault.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!(
            "Deposited {} USDC into rent vault for property '{}'",
            amount,
            ctx.accounts.property_account.property_id
        );
        Ok(())
    }

    /// Claim proportional rent for a token holder.
    /// Formula: claimable = (holder_balance / total_supply) * vault_balance
    /// Signed by the property PDA so the vault PDA can be drained.
    pub fn claim_rent(ctx: Context<ClaimRent>) -> Result<()> {
        require!(
            ctx.accounts.property_account.status == PropertyStatus::Tokenized,
            PropertyError::NotTokenized
        );

        let vault_balance = ctx.accounts.rent_vault.amount;
        require!(vault_balance > 0, PropertyError::VaultEmpty);

        let holder_balance = ctx.accounts.holder_token_account.amount;
        let total_supply = ctx.accounts.property_account.total_supply;
        require!(holder_balance > 0, PropertyError::NoTokensHeld);

        // claimable = floor(vault_balance * holder_balance / total_supply)
        let claimable = (vault_balance as u128)
            .checked_mul(holder_balance as u128)
            .unwrap()
            .checked_div(total_supply as u128)
            .unwrap() as u64;
        require!(claimable > 0, PropertyError::NothingToClaim);

        // PDA signer
        let property_id_bytes = ctx.accounts.property_account.property_id.clone();
        let property_id_ref = property_id_bytes.as_bytes();
        let bump = ctx.bumps.property_account;
        let seeds: &[&[u8]] = &[b"property", property_id_ref, &[bump]];
        let signer_seeds = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.rent_vault.to_account_info(),
                    to: ctx.accounts.holder_usdc_account.to_account_info(),
                    authority: ctx.accounts.property_account.to_account_info(),
                },
                signer_seeds,
            ),
            claimable,
        )?;

        msg!(
            "Holder {} claimed {} USDC for property '{}'",
            ctx.accounts.holder.key(),
            claimable,
            ctx.accounts.property_account.property_id
        );
        Ok(())
    }
}

// ------------------------------------------------------------------
// Account contexts
// ------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeVerifier<'info> {
    #[account(
        init,
        payer = authority,
        space = VERIFIER_SPACE,
        seeds = [b"verifier", authority.key().as_ref()],
        bump
    )]
    pub verifier: Account<'info, Verifier>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(property_id: String)]
pub struct InitializeProperty<'info> {
    #[account(
        init,
        payer = owner,
        space = PROPERTY_ACCOUNT_SPACE,
        seeds = [b"property", property_id.as_bytes()],
        bump
    )]
    pub property_account: Account<'info, PropertyAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyProperty<'info> {
    #[account(mut)]
    pub property_account: Account<'info, PropertyAccount>,

    /// Verifier PDA — validated via seeds; its stored authority must match signer.
    #[account(
        seeds = [b"verifier", verify_authority.key().as_ref()],
        bump,
        constraint = verifier.authority == verify_authority.key() @ PropertyError::UnauthorizedVerifier
    )]
    pub verifier: Account<'info, Verifier>,

    pub verify_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TokenizeProperty<'info> {
    #[account(
        mut,
        has_one = owner,
        seeds = [b"property", property_account.property_id.as_bytes()],
        bump
    )]
    pub property_account: Account<'info, PropertyAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// New SPL token mint — created in this tx. Mint authority = property PDA.
    #[account(
        init,
        payer = owner,
        mint::decimals = 2,
        mint::authority = property_account,
    )]
    pub token_mint: Account<'info, Mint>,

    /// Owner's ATA to receive initial supply.
    #[account(
        init,
        payer = owner,
        associated_token::mint = token_mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositRent<'info> {
    #[account(
        seeds = [b"property", property_account.property_id.as_bytes()],
        bump
    )]
    pub property_account: Account<'info, PropertyAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// Payer's USDC token account.
    #[account(mut)]
    pub payer_usdc_account: Account<'info, TokenAccount>,

    /// Rent vault PDA — holds USDC on behalf of all token holders.
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [b"rent_vault", property_account.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = property_account,
    )]
    pub rent_vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ClaimRent<'info> {
    #[account(
        seeds = [b"property", property_account.property_id.as_bytes()],
        bump
    )]
    pub property_account: Account<'info, PropertyAccount>,

    pub holder: Signer<'info>,

    /// Holder's property token account — proves ownership share.
    #[account(
        associated_token::mint = property_token_mint,
        associated_token::authority = holder,
    )]
    pub holder_token_account: Account<'info, TokenAccount>,

    /// The SPL mint for this property's tokens.
    pub property_token_mint: Account<'info, Mint>,

    /// Holder's USDC account to receive the rent payout.
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = holder,
    )]
    pub holder_usdc_account: Account<'info, TokenAccount>,

    /// Rent vault PDA — source of rent payouts.
    #[account(
        mut,
        seeds = [b"rent_vault", property_account.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = property_account,
    )]
    pub rent_vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

// ------------------------------------------------------------------
// On-chain account structs
// ------------------------------------------------------------------

#[account]
pub struct PropertyAccount {
    pub owner: Pubkey,
    pub property_id: String,
    pub metadata_hash: String,
    pub metadata_uri: String,
    pub status: PropertyStatus,
    pub timestamp: i64,
    pub token_mint: Option<Pubkey>,
    pub total_supply: u64,
}

#[account]
pub struct Verifier {
    pub authority: Pubkey,
}

// ------------------------------------------------------------------
// Enums & Errors
// ------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PropertyStatus {
    PendingVerification,
    Verified,
    Rejected,
    Tokenized,
}

#[error_code]
pub enum PropertyError {
    #[msg("Property has not been verified yet")]
    NotVerified,
    #[msg("Property is not tokenized yet")]
    NotTokenized,
    #[msg("Property has already been tokenized")]
    AlreadyTokenized,
    #[msg("Property status does not allow this action")]
    InvalidStatus,
    #[msg("Signer is not an authorised verifier")]
    UnauthorizedVerifier,
    #[msg("Total supply must be greater than zero")]
    InvalidSupply,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Rent vault has no funds")]
    VaultEmpty,
    #[msg("Holder has no tokens for this property")]
    NoTokensHeld,
    #[msg("Claimable amount rounds down to zero")]
    NothingToClaim,
    #[msg("String value exceeds maximum allowed length")]
    StringTooLong,
}
