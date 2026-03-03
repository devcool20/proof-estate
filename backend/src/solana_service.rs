use solana_sdk::{
    signature::{Keypair, Signer},
    pubkey::Pubkey,
    instruction::{AccountMeta, Instruction},
    transaction::Transaction,
};
use solana_client::rpc_client::RpcClient;
use std::str::FromStr;

pub struct SolanaService {
    client: RpcClient,
    program_id: Pubkey,
    verifier_key: Keypair,
}

impl SolanaService {
    pub fn new() -> Self {
        let rpc_url = std::env::var("SOLANA_RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());
        let p_id_str = std::env::var("PROGRAM_ID").unwrap_or_else(|_| "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS".to_string());
        let secret = std::env::var("VERIFIER_SECRET_KEY").unwrap_or_default();

        let client = RpcClient::new(rpc_url);
        let program_id = Pubkey::from_str(&p_id_str).unwrap();
        
        // In demo mode, if secret is empty, generate a dummy key
        let verifier_key = if !secret.is_empty() {
            let bytes = bs58::decode(&secret).into_vec().unwrap_or_default();
            Keypair::from_bytes(&bytes).unwrap_or_else(|_| Keypair::new())
        } else {
            Keypair::new()
        };

        Self { client, program_id, verifier_key }
    }

    pub fn get_property_pda(&self, property_id: &str) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"property", property_id.as_bytes()],
            &self.program_id
        )
    }

    pub async fn initialize_on_chain(&self, property_id: &str, metadata_hash: &str) -> anyhow::Result<String> {
        let (property_pda, _) = self.get_property_pda(property_id);
        
        // sighash for "global:initialize_property"
        let mut ix_data = vec![];
        ix_data.extend_from_slice(&anchor_lang::solana_program::hash::hash(b"global:initialize_property").to_bytes()[..8]);
        
        // Bohr encoding for String (4 bytes length + bytes)
        let id_bytes = property_id.as_bytes();
        ix_data.extend_from_slice(&(id_bytes.len() as u32).to_le_bytes());
        ix_data.extend_from_slice(id_bytes);

        let hash_bytes = metadata_hash.as_bytes();
        ix_data.extend_from_slice(&(hash_bytes.len() as u32).to_le_bytes());
        ix_data.extend_from_slice(hash_bytes);

        let accounts = vec![
            AccountMeta::new(property_pda, false),
            AccountMeta::new(self.verifier_key.pubkey(), true), // Payer
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ];

        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data: ix_data,
        };

        let recent_blockhash = self.client.get_latest_blockhash()?;
        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&self.verifier_key.pubkey()),
            &[&self.verifier_key],
            recent_blockhash,
        );

        let signature = self.client.send_and_confirm_transaction(&tx)?;
        Ok(signature.to_string())
    }

    pub async fn verify_on_chain(&self, property_id: &str) -> anyhow::Result<String> {
        let (property_pda, _) = self.get_property_pda(property_id);
        
        // This corresponds to the anchor `verify_property` instruction
        // We'll use the sighash or similar.
        // For simplicity, we can use the hex string of the instruction name if needed
        // but anchor uses the first 8 bytes of Sha256("global:verify_property")
        let ix_data = {
            let mut data = vec![];
            data.extend_from_slice(&anchor_lang::solana_program::hash::hash(b"global:verify_property").to_bytes()[..8]);
            data
        };

        let accounts = vec![
            AccountMeta::new(property_pda, false),
            AccountMeta::new_readonly(self.verifier_key.pubkey(), true),
        ];

        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data: ix_data,
        };

        let recent_blockhash = self.client.get_latest_blockhash()?;
        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&self.verifier_key.pubkey()),
            &[&self.verifier_key],
            recent_blockhash,
        );

        let signature = self.client.send_and_confirm_transaction(&tx)?;
        Ok(signature.to_string())
    }
}
