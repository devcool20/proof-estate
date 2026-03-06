use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
    system_program,
};
use solana_client::rpc_client::RpcClient;
use std::str::FromStr;

pub struct SolanaService {
    pub client: RpcClient,
    pub program_id: Pubkey,
    pub verifier_key: Keypair,
}

impl SolanaService {
    pub fn new() -> Self {
        let rpc_url = std::env::var("SOLANA_RPC_URL")
            .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());
        let p_id_str = std::env::var("PROGRAM_ID")
            .unwrap_or_else(|_| "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS".to_string());
        let secret = std::env::var("VERIFIER_SECRET_KEY").unwrap_or_default();

        let client = RpcClient::new(rpc_url);
        let program_id = Pubkey::from_str(&p_id_str).expect("Invalid PROGRAM_ID");

        let verifier_key = if !secret.is_empty() {
            let bytes = bs58::decode(&secret)
                .into_vec()
                .unwrap_or_default();
            Keypair::from_bytes(&bytes).unwrap_or_else(|_| Keypair::new())
        } else {
            // Demo / CI mode — ephemeral keypair (no real txns)
            Keypair::new()
        };

        Self { client, program_id, verifier_key }
    }

    // ──────────────────────────────────────────────────────
    // PDA derivations
    // ──────────────────────────────────────────────────────

    pub fn get_property_pda(&self, property_name: &str) -> (Pubkey, u8) {
        // Handle cases where property name might be too long or contain invalid chars
        let name_bytes = if property_name.len() > 32 {
            &property_name.as_bytes()[..32]
        } else {
            property_name.as_bytes()
        };
        
        Pubkey::find_program_address(
            &[b"property", name_bytes],
            &self.program_id,
        )
    }

    pub fn get_verifier_pda(&self, authority: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"verifier", authority.as_ref()],
            &self.program_id,
        )
    }

    pub fn get_rent_vault_pda(&self, property_pda: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"rent_vault", property_pda.as_ref()],
            &self.program_id,
        )
    }

    // Helper: Anchor discriminator = first 8 bytes of sha256("global:<ix_name>")
    fn ix_discriminator(name: &str) -> [u8; 8] {
        use solana_sdk::hash::hash;
        let h = hash(format!("global:{}", name).as_bytes());
        let mut disc = [0u8; 8];
        disc.copy_from_slice(&h.to_bytes()[..8]);
        disc
    }

    fn encode_string(buf: &mut Vec<u8>, s: &str) {
        buf.extend_from_slice(&(s.len() as u32).to_le_bytes());
        buf.extend_from_slice(s.as_bytes());
    }

    // ──────────────────────────────────────────────────────
    // Instructions
    // ──────────────────────────────────────────────────────

    /// Initialize the verifier PDA for the backend's verifier keypair.
    /// Call once at onboarding; safe to re-call (account already initialized
    /// → tx will fail, which is fine; caller can ignore that error).
    pub async fn initialize_verifier(&self) -> anyhow::Result<String> {
        let (verifier_pda, _) = self.get_verifier_pda(&self.verifier_key.pubkey());

        let mut data = Self::ix_discriminator("initialize_verifier").to_vec();
        // No additional args for this instruction

        let accounts = vec![
            AccountMeta::new(verifier_pda, false),
            AccountMeta::new(self.verifier_key.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ];

        self.send_instruction("initialize_verifier", accounts, data).await
    }

    /// Initialize a property on-chain. Now includes metadata_uri.
    pub async fn initialize_on_chain(
        &self,
        property_name: &str,
        metadata_hash: &str,
        metadata_uri: &str,
    ) -> anyhow::Result<String> {
        let (property_pda, _) = self.get_property_pda(property_name);

        let mut data = Self::ix_discriminator("initialize_property").to_vec();
        Self::encode_string(&mut data, property_name);
        Self::encode_string(&mut data, metadata_hash);
        Self::encode_string(&mut data, metadata_uri);

        let accounts = vec![
            AccountMeta::new(property_pda, false),
            AccountMeta::new(self.verifier_key.pubkey(), true), // payer (backend pays)
            AccountMeta::new_readonly(system_program::ID, false),
        ];

        self.send_instruction("initialize_property", accounts, data).await
    }

    /// Verify (approve or reject) a property on-chain.
    /// The backend wallet must be the registered verifier authority.
    pub async fn verify_on_chain(
        &self,
        property_name: &str,
        approved: bool,
    ) -> anyhow::Result<String> {
        let (property_pda, _) = self.get_property_pda(property_name);
        let (verifier_pda, _) = self.get_verifier_pda(&self.verifier_key.pubkey());

        let mut data = Self::ix_discriminator("verify_property").to_vec();
        // `approved` is a bool → Borsh serialises to 1 byte (0 or 1)
        data.push(u8::from(approved));

        let accounts = vec![
            AccountMeta::new(property_pda, false),
            AccountMeta::new_readonly(verifier_pda, false),
            AccountMeta::new_readonly(self.verifier_key.pubkey(), true),
        ];

        self.send_instruction("verify_property", accounts, data).await
    }

    /// Deposit USDC rent into the property's rent vault.
    /// In production the caller passes their own USDC ATA; here we use the
    /// backend's ATA for demo / automated rent collection.
    pub async fn deposit_rent(
        &self,
        property_name: &str,
        amount: u64,
        payer_usdc_account: &Pubkey,
        usdc_mint: &Pubkey,
        token_program: &Pubkey,
    ) -> anyhow::Result<String> {
        let (property_pda, _) = self.get_property_pda(property_name);
        let (rent_vault_pda, _) = self.get_rent_vault_pda(&property_pda);

        let mut data = Self::ix_discriminator("deposit_rent").to_vec();
        data.extend_from_slice(&amount.to_le_bytes());

        let accounts = vec![
            AccountMeta::new_readonly(property_pda, false),
            AccountMeta::new(self.verifier_key.pubkey(), true), // payer
            AccountMeta::new(*payer_usdc_account, false),
            AccountMeta::new(rent_vault_pda, false),
            AccountMeta::new_readonly(*usdc_mint, false),
            AccountMeta::new_readonly(system_program::ID, false),
            AccountMeta::new_readonly(*token_program, false),
            AccountMeta::new_readonly(solana_sdk::sysvar::rent::ID, false),
        ];

        self.send_instruction("deposit_rent", accounts, data).await
    }

    // ──────────────────────────────────────────────────────
    // Internal helper: build + send a signed transaction
    // ──────────────────────────────────────────────────────
    async fn send_instruction(
        &self,
        label: &str,
        accounts: Vec<AccountMeta>,
        data: Vec<u8>,
    ) -> anyhow::Result<String> {
        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data,
        };

        let recent_blockhash = self.client.get_latest_blockhash()?;
        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&self.verifier_key.pubkey()),
            &[&self.verifier_key],
            recent_blockhash,
        );

        let sig = self.client.send_and_confirm_transaction(&tx)?;
        println!("✅ [{}] tx: {}", label, sig);
        Ok(sig.to_string())
    }
}
