use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod proof_estate {
    use super::*;

    pub fn initialize_property(
        ctx: Context<InitializeProperty>,
        property_id: String,
        metadata_hash: String,
    ) -> Result<()> {
        let property = &mut ctx.accounts.property_account;
        property.owner = ctx.accounts.owner.key();
        property.property_id = property_id;
        property.metadata_hash = metadata_hash;
        property.status = PropertyStatus::PendingVerification;
        property.timestamp = Clock::get()?.unix_timestamp;
        
        msg!("Property {} initialized by {}", property.property_id, property.owner);
        Ok(())
    }

    pub fn verify_property(ctx: Context<VerifyProperty>) -> Result<()> {
        let property = &mut ctx.accounts.property_account;
        
        // Trust the caller if it's the verify_authority
        property.status = PropertyStatus::Verified;
        property.timestamp = Clock::get()?.unix_timestamp;

        msg!("Property {} verified", property.property_id);
        Ok(())
    }

    pub fn tokenize_property(
        ctx: Context<TokenizeProperty>,
        total_supply: u64,
    ) -> Result<()> {
        let property = &mut ctx.accounts.property_account;
        require!(property.status == PropertyStatus::Verified, PropertyError::NotVerified);

        // Sign for the PDA
        let property_id_bytes = property.property_id.as_bytes();
        let bump = ctx.bumps.property_account;
        let seeds = &[b"property", property_id_bytes, &[bump]];
        let signer = &[&seeds[..]];

        // Mint initial supply 
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: property.to_account_info(), // The property PDA is the mint authority
                },
                signer,
            ),
            total_supply,
        )?;

        property.status = PropertyStatus::Tokenized;
        msg!("Property {} tokenized with supply {}", property.property_id, total_supply);
        Ok(())
    }

    // Mock distribute rent for Phase MVP. Real impl involves calculating percentage per holder or transferring to a staking vault.
    pub fn distribute_rent(ctx: Context<DistributeRent>, amount: u64) -> Result<()> {
        let property = &mut ctx.accounts.property_account;
        require!(property.status == PropertyStatus::Tokenized, PropertyError::NotTokenized);
        
        // Transfer USDC from Backend/Tenant to the Rent Vault PDA representing this property
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    to: ctx.accounts.rent_vault.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!("Rent {} USDC distributed for property {}", amount, property.property_id);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(property_id: String)]
pub struct InitializeProperty<'info> {
    #[account(
        init, 
        payer = owner, 
        space = 8 + 32 + 4 + 64 + 4 + 64 + 1 + 8, // approximated space
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

    #[account(
        init,
        payer = owner,
        mint::decimals = 2,
        mint::authority = property_account, // PDA is authority
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = owner,
        associated_token::mint = token_mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
}

#[derive(Accounts)]
pub struct DistributeRent<'info> {
    #[account(
        seeds = [b"property", property_account.property_id.as_bytes()],
        bump
    )]
    pub property_account: Account<'info, PropertyAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub payer_token_account: Account<'info, TokenAccount>, // USDC

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

#[account]
pub struct PropertyAccount {
    pub owner: Pubkey,
    pub property_id: String,
    pub metadata_hash: String,
    pub status: PropertyStatus,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PropertyStatus {
    PendingVerification,
    Verified,
    Tokenized,
}

#[error_code]
pub enum PropertyError {
    #[msg("Property has not been verified yet")]
    NotVerified,
    #[msg("Property is not tokenized yet")]
    NotTokenized,
}
