import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";

export const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Complete IDL matching the on-chain Anchor program
export const IDL: any = {
    "version": "0.1.0",
    "name": "proof_estate",
    "instructions": [
        {
            "name": "initializeVerifier",
            "accounts": [
                { "name": "verifier", "writable": true, "signer": false },
                { "name": "authority", "writable": true, "signer": true },
                { "name": "systemProgram", "writable": false, "signer": false }
            ],
            "args": []
        },
        {
            "name": "initializeProperty",
            "accounts": [
                { "name": "propertyAccount", "writable": true, "signer": false },
                { "name": "owner", "writable": true, "signer": true },
                { "name": "systemProgram", "writable": false, "signer": false }
            ],
            "args": [
                { "name": "propertyId", "type": "string" },
                { "name": "metadataHash", "type": "string" },
                { "name": "metadataUri", "type": "string" }
            ]
        },
        {
            "name": "verifyProperty",
            "accounts": [
                { "name": "propertyAccount", "writable": true, "signer": false },
                { "name": "verifier", "writable": false, "signer": false },
                { "name": "verifyAuthority", "writable": false, "signer": true }
            ],
            "args": [
                { "name": "approved", "type": "bool" }
            ]
        },
        {
            "name": "tokenizeProperty",
            "accounts": [
                { "name": "propertyAccount", "writable": true, "signer": false },
                { "name": "owner", "writable": true, "signer": true },
                { "name": "tokenMint", "writable": true, "signer": true },
                { "name": "ownerTokenAccount", "writable": true, "signer": false },
                { "name": "systemProgram", "writable": false, "signer": false },
                { "name": "tokenProgram", "writable": false, "signer": false },
                { "name": "associatedTokenProgram", "writable": false, "signer": false },
                { "name": "rent", "writable": false, "signer": false }
            ],
            "args": [
                { "name": "totalSupply", "type": "u64" }
            ]
        },
        {
            "name": "depositRent",
            "accounts": [
                { "name": "propertyAccount", "writable": false, "signer": false },
                { "name": "payer", "writable": true, "signer": true },
                { "name": "payerUsdcAccount", "writable": true, "signer": false },
                { "name": "rentVault", "writable": true, "signer": false },
                { "name": "usdcMint", "writable": false, "signer": false },
                { "name": "systemProgram", "writable": false, "signer": false },
                { "name": "tokenProgram", "writable": false, "signer": false },
                { "name": "rent", "writable": false, "signer": false }
            ],
            "args": [
                { "name": "amount", "type": "u64" }
            ]
        },
        {
            "name": "claimRent",
            "accounts": [
                { "name": "propertyAccount", "writable": false, "signer": false },
                { "name": "holder", "writable": false, "signer": true },
                { "name": "holderTokenAccount", "writable": false, "signer": false },
                { "name": "propertyTokenMint", "writable": false, "signer": false },
                { "name": "holderUsdcAccount", "writable": true, "signer": false },
                { "name": "rentVault", "writable": true, "signer": false },
                { "name": "usdcMint", "writable": false, "signer": false },
                { "name": "tokenProgram", "writable": false, "signer": false },
                { "name": "associatedTokenProgram", "writable": false, "signer": false }
            ],
            "args": []
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
                    { "name": "metadataUri", "type": "string" },
                    { "name": "status", "type": { "defined": "PropertyStatus" } },
                    { "name": "timestamp", "type": "i64" },
                    { "name": "tokenMint", "type": { "option": "publicKey" } },
                    { "name": "totalSupply", "type": "u64" }
                ]
            }
        },
        {
            "name": "Verifier",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "authority", "type": "publicKey" }
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
                    { "name": "Rejected" },
                    { "name": "Tokenized" }
                ]
            }
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "NotVerified",
            "msg": "Property has not been verified yet"
        },
        {
            "code": 6001,
            "name": "NotTokenized",
            "msg": "Property is not tokenized yet"
        },
        {
            "code": 6002,
            "name": "AlreadyTokenized",
            "msg": "Property has already been tokenized"
        },
        {
            "code": 6003,
            "name": "InvalidStatus",
            "msg": "Property status does not allow this action"
        },
        {
            "code": 6004,
            "name": "UnauthorizedVerifier",
            "msg": "Signer is not an authorised verifier"
        },
        {
            "code": 6005,
            "name": "InvalidSupply",
            "msg": "Total supply must be greater than zero"
        },
        {
            "code": 6006,
            "name": "InvalidAmount",
            "msg": "Amount must be greater than zero"
        },
        {
            "code": 6007,
            "name": "VaultEmpty",
            "msg": "Rent vault has no funds"
        },
        {
            "code": 6008,
            "name": "NoTokensHeld",
            "msg": "Holder has no tokens for this property"
        },
        {
            "code": 6009,
            "name": "NothingToClaim",
            "msg": "Claimable amount rounds down to zero"
        },
        {
            "code": 6010,
            "name": "StringTooLong",
            "msg": "String value exceeds maximum allowed length"
        }
    ]
};

export function getPropertyPDA(propertyId: string) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("property"), Buffer.from(propertyId)],
        PROGRAM_ID
    );
}
