import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";

export const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Mock IDL if not generated yet. Contains only the tokenize_property instruction.
export const IDL: any = {
    "version": "0.1.0",
    "name": "proof_estate",
    "instructions": [
        {
            "name": "tokenizeProperty",
            "accounts": [
                { "name": "propertyAccount", "writable": true, "signer": false },
                { "name": "owner", "writable": true, "signer": true },
                { "name": "tokenMint", "writable": true, "signer": true },
                { "name": "ownerTokenAccount", "writable": true, "signer": false },
                { "name": "systemProgram", "writable": false, "signer": false },
                { "name": "tokenProgram", "writable": false, "signer": false },
                { "name": "rent", "writable": false, "signer": false },
                { "name": "associatedTokenProgram", "writable": false, "signer": false }
            ],
            "args": [
                { "name": "totalSupply", "type": "u64" }
            ]
        }
    ],
    "accounts": [
        {
            "name": "PropertyAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "owner", "type": "publicKey" },
                    { "name": "propertyId", "type": "string" },
                    { "name": "metadataHash", "type": "string" },
                    { "name": "status", "type": { "defined": "PropertyStatus" } },
                    { "name": "timestamp", "type": "i64" }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "PropertyStatus",
            "type": {
                "kind": "enum",
                "variants": [
                    { "name": "PendingVerification" },
                    { "name": "Verified" },
                    { "name": "Tokenized" }
                ]
            }
        }
    ]
};

export function getPropertyPDA(propertyId: string) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("property"), Buffer.from(propertyId)],
        PROGRAM_ID
    );
}
