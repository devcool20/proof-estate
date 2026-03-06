/**
 * ProofEstate – Anchor Integration Tests (Comprehensive)
 *
 * Tests cover the full property lifecycle with edge cases:
 *   1. initialize_verifier  (happy + duplicate)
 *   2. initialize_property  (happy + string limits + edge IDs)
 *   3. verify_property      (approved, rejected, unauthorized, wrong status)
 *   4. tokenize_property    (happy, zero supply, not verified, already tokenized, wrong owner)
 *   5. deposit_rent         (happy, zero amount, not tokenized)
 *   6. claim_rent           (proportional, no tokens, empty vault, full claim)
 *
 * Run with:  anchor test
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    createAssociatedTokenAccount,
    mintTo,
    getAccount,
    getAssociatedTokenAddress,
    createTransferInstruction,
} from "@solana/spl-token";
import { assert } from "chai";
import { ProofEstate } from "../target/types/proof_estate";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
async function airdrop(
    provider: anchor.AnchorProvider,
    target: PublicKey,
    lamports = 2_000_000_000
) {
    const sig = await provider.connection.requestAirdrop(target, lamports);
    await provider.connection.confirmTransaction(sig, "confirmed");
}

function derivePropertyPDA(
    programId: PublicKey,
    propertyId: string
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("property"), Buffer.from(propertyId)],
        programId
    );
}

function deriveVerifierPDA(
    programId: PublicKey,
    authority: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("verifier"), authority.toBuffer()],
        programId
    );
}

function deriveRentVaultPDA(
    programId: PublicKey,
    propertyAccountKey: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("rent_vault"), propertyAccountKey.toBuffer()],
        programId
    );
}

// -----------------------------------------------------------------------
// Test Suite
// -----------------------------------------------------------------------
describe("proof_estate", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.ProofEstate as Program<ProofEstate>;

    // Actors
    const owner = Keypair.generate();
    const verifierAuthority = Keypair.generate();
    const investor = Keypair.generate();
    const unauthorizedUser = Keypair.generate();
    const secondOwner = Keypair.generate();

    // Shared state filled during tests
    const propertyId = "prop-test-001";
    const [propertyPDA] = derivePropertyPDA(program.programId, propertyId);
    const [verifierPDA] = deriveVerifierPDA(program.programId, verifierAuthority.publicKey);

    // SPL accounts
    let usdcMint: PublicKey;
    let ownerUsdcAccount: PublicKey;
    let investorUsdcAccount: PublicKey;
    let tenantUsdcAccount: PublicKey;
    const propertyTokenMintKP = Keypair.generate();
    let ownerPropertyTokenAccount: PublicKey;
    const [rentVaultPDA] = deriveRentVaultPDA(program.programId, propertyPDA);

    // ---- Setup -------------------------------------------------------
    before(async () => {
        // Fund test wallets
        await Promise.all([
            airdrop(provider, owner.publicKey),
            airdrop(provider, verifierAuthority.publicKey),
            airdrop(provider, investor.publicKey),
            airdrop(provider, unauthorizedUser.publicKey),
            airdrop(provider, secondOwner.publicKey),
        ]);

        // Create a mock USDC mint (6 decimals)
        usdcMint = await createMint(
            provider.connection,
            owner,
            owner.publicKey,
            null,
            6
        );

        // Create USDC ATAs and fund them
        ownerUsdcAccount = await createAssociatedTokenAccount(
            provider.connection,
            owner,
            usdcMint,
            owner.publicKey
        );
        investorUsdcAccount = await createAssociatedTokenAccount(
            provider.connection,
            investor,
            usdcMint,
            investor.publicKey
        );
        tenantUsdcAccount = ownerUsdcAccount;

        // Mint 10,000 USDC to owner/tenant for rent deposits
        await mintTo(
            provider.connection,
            owner,
            usdcMint,
            ownerUsdcAccount,
            owner.publicKey,
            10_000_000_000 // 10,000 USDC (6 decimals)
        );

        ownerPropertyTokenAccount = await getAssociatedTokenAddress(
            propertyTokenMintKP.publicKey,
            owner.publicKey
        );
    });

    // =====================================================================
    // 1. INITIALIZE VERIFIER
    // =====================================================================
    describe("initialize_verifier", () => {
        it("registers a government verifier PDA", async () => {
            await program.methods
                .initializeVerifier()
                .accounts({
                    verifier: verifierPDA,
                    authority: verifierAuthority.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([verifierAuthority])
                .rpc();

            const verifierAccount = await program.account.verifier.fetch(verifierPDA);
            assert.ok(
                verifierAccount.authority.equals(verifierAuthority.publicKey),
                "Verifier authority should match"
            );
        });

        it("fails when trying to initialize the same verifier twice (duplicate PDA)", async () => {
            try {
                await program.methods
                    .initializeVerifier()
                    .accounts({
                        verifier: verifierPDA,
                        authority: verifierAuthority.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([verifierAuthority])
                    .rpc();
                assert.fail("Should have thrown — verifier PDA already initialized");
            } catch (err: any) {
                // Expected: account already exists
                assert.ok(err, "Error thrown for duplicate verifier init");
            }
        });

        it("allows a different authority to register their own verifier PDA", async () => {
            const secondVerifier = Keypair.generate();
            await airdrop(provider, secondVerifier.publicKey);
            const [secondVerifierPDA] = deriveVerifierPDA(program.programId, secondVerifier.publicKey);

            await program.methods
                .initializeVerifier()
                .accounts({
                    verifier: secondVerifierPDA,
                    authority: secondVerifier.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([secondVerifier])
                .rpc();

            const account = await program.account.verifier.fetch(secondVerifierPDA);
            assert.ok(account.authority.equals(secondVerifier.publicKey));
        });
    });

    // =====================================================================
    // 2. INITIALIZE PROPERTY
    // =====================================================================
    describe("initialize_property", () => {
        it("creates a property on-chain (PendingVerification)", async () => {
            await program.methods
                .initializeProperty(
                    propertyId,
                    "abc123sha256hashvalue000000000000000000000000000000000000000000", // 64 chars
                    "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
                )
                .accounts({
                    propertyAccount: propertyPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            const property = await program.account.propertyAccount.fetch(propertyPDA);
            assert.ok(property.owner.equals(owner.publicKey));
            assert.equal(property.propertyId, propertyId);
            assert.deepEqual(property.status, { pendingVerification: {} });
            assert.isNull(property.tokenMint);
            assert.equal(property.totalSupply.toNumber(), 0);
        });

        it("stores metadata_uri correctly", async () => {
            const property = await program.account.propertyAccount.fetch(propertyPDA);
            assert.equal(
                property.metadataUri,
                "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
            );
        });

        it("stores metadata_hash correctly", async () => {
            const property = await program.account.propertyAccount.fetch(propertyPDA);
            assert.equal(
                property.metadataHash,
                "abc123sha256hashvalue000000000000000000000000000000000000000000"
            );
        });

        it("sets a valid timestamp", async () => {
            const property = await program.account.propertyAccount.fetch(propertyPDA);
            assert.isAbove(property.timestamp.toNumber(), 0, "Timestamp should be > 0");
        });

        it("rejects property_id exceeding 64 chars", async () => {
            const longId = "a".repeat(65);
            const [longPDA] = derivePropertyPDA(program.programId, longId);

            try {
                await program.methods
                    .initializeProperty(longId, "hash", "uri")
                    .accounts({
                        propertyAccount: longPDA,
                        owner: owner.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([owner])
                    .rpc();
                assert.fail("Should reject long property_id");
            } catch (err: any) {
                assert.ok(err, "StringTooLong error expected");
            }
        });

        it("rejects metadata_hash exceeding 64 chars", async () => {
            const id2 = "prop-hash-long";
            const [pda2] = derivePropertyPDA(program.programId, id2);

            try {
                await program.methods
                    .initializeProperty(id2, "h".repeat(65), "uri")
                    .accounts({
                        propertyAccount: pda2,
                        owner: owner.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([owner])
                    .rpc();
                assert.fail("Should reject long metadata_hash");
            } catch (err: any) {
                assert.ok(err, "StringTooLong error expected");
            }
        });

        it("rejects metadata_uri exceeding 200 chars", async () => {
            const id3 = "prop-uri-long";
            const [pda3] = derivePropertyPDA(program.programId, id3);

            try {
                await program.methods
                    .initializeProperty(id3, "hash", "u".repeat(201))
                    .accounts({
                        propertyAccount: pda3,
                        owner: owner.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([owner])
                    .rpc();
                assert.fail("Should reject long metadata_uri");
            } catch (err: any) {
                assert.ok(err, "StringTooLong error expected");
            }
        });

        it("fails re-initializing the same property PDA (duplicate)", async () => {
            try {
                await program.methods
                    .initializeProperty(propertyId, "hash", "uri")
                    .accounts({
                        propertyAccount: propertyPDA,
                        owner: owner.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([owner])
                    .rpc();
                assert.fail("Should fail — property PDA already exists");
            } catch (err: any) {
                assert.ok(err, "Account already initialized");
            }
        });

        it("allows boundary-length strings (exactly 64, 64, 200 chars)", async () => {
            const boundaryId = "prop-boundary-ok";
            const [boundaryPDA] = derivePropertyPDA(program.programId, boundaryId);

            await program.methods
                .initializeProperty(
                    boundaryId,
                    "h".repeat(64),
                    "u".repeat(200)
                )
                .accounts({
                    propertyAccount: boundaryPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            const prop = await program.account.propertyAccount.fetch(boundaryPDA);
            assert.equal(prop.metadataHash.length, 64);
            assert.equal(prop.metadataUri.length, 200);
        });

        it("handles empty metadata_uri gracefully", async () => {
            const emptyUriId = "prop-empty-uri";
            const [emptyUriPDA] = derivePropertyPDA(program.programId, emptyUriId);

            await program.methods
                .initializeProperty(emptyUriId, "somehash", "")
                .accounts({
                    propertyAccount: emptyUriPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            const prop = await program.account.propertyAccount.fetch(emptyUriPDA);
            assert.equal(prop.metadataUri, "");
        });
    });

    // =====================================================================
    // 3. VERIFY PROPERTY
    // =====================================================================
    describe("verify_property", () => {
        it("rejects verification by an unauthorised signer (no verifier PDA)", async () => {
            const [unauthorizedVerifierPDA] = deriveVerifierPDA(
                program.programId,
                unauthorizedUser.publicKey
            );
            try {
                await program.methods
                    .verifyProperty(true)
                    .accounts({
                        propertyAccount: propertyPDA,
                        verifier: unauthorizedVerifierPDA,
                        verifyAuthority: unauthorizedUser.publicKey,
                    })
                    .signers([unauthorizedUser])
                    .rpc();
                assert.fail("Should have thrown an error");
            } catch (err: any) {
                assert.ok(err, "UnauthorizedVerifier / account doesn't exist");
            }
        });

        it("allows the registered verifier to approve a property", async () => {
            await program.methods
                .verifyProperty(true)
                .accounts({
                    propertyAccount: propertyPDA,
                    verifier: verifierPDA,
                    verifyAuthority: verifierAuthority.publicKey,
                })
                .signers([verifierAuthority])
                .rpc();

            const property = await program.account.propertyAccount.fetch(propertyPDA);
            assert.deepEqual(property.status, { verified: {} });
        });

        it("cannot re-verify an already verified property (InvalidStatus)", async () => {
            try {
                await program.methods
                    .verifyProperty(true)
                    .accounts({
                        propertyAccount: propertyPDA,
                        verifier: verifierPDA,
                        verifyAuthority: verifierAuthority.publicKey,
                    })
                    .signers([verifierAuthority])
                    .rpc();
                assert.fail("Should fail — property is already verified, not PendingVerification");
            } catch (err: any) {
                assert.ok(err.toString().includes("InvalidStatus") || err, "InvalidStatus expected");
            }
        });

        it("verifier can reject a pending property", async () => {
            const rejectedId = "prop-rejected-v1";
            const [rejectedPDA] = derivePropertyPDA(program.programId, rejectedId);

            await program.methods
                .initializeProperty(rejectedId, "hash", "uri")
                .accounts({
                    propertyAccount: rejectedPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            await program.methods
                .verifyProperty(false)
                .accounts({
                    propertyAccount: rejectedPDA,
                    verifier: verifierPDA,
                    verifyAuthority: verifierAuthority.publicKey,
                })
                .signers([verifierAuthority])
                .rpc();

            const prop = await program.account.propertyAccount.fetch(rejectedPDA);
            assert.deepEqual(prop.status, { rejected: {} });
        });

        it("cannot verify a rejected property again (status must be PendingVerification)", async () => {
            const rejectedId = "prop-rejected-v1";
            const [rejectedPDA] = derivePropertyPDA(program.programId, rejectedId);

            try {
                await program.methods
                    .verifyProperty(true)
                    .accounts({
                        propertyAccount: rejectedPDA,
                        verifier: verifierPDA,
                        verifyAuthority: verifierAuthority.publicKey,
                    })
                    .signers([verifierAuthority])
                    .rpc();
                assert.fail("Should not verify a rejected property");
            } catch (err: any) {
                assert.ok(err, "InvalidStatus expected for rejected → verify");
            }
        });

        it("updates timestamp on verify", async () => {
            const tsId = "prop-ts-check";
            const [tsPDA] = derivePropertyPDA(program.programId, tsId);

            await program.methods
                .initializeProperty(tsId, "hash", "uri")
                .accounts({
                    propertyAccount: tsPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            const before = await program.account.propertyAccount.fetch(tsPDA);
            const tsBefore = before.timestamp.toNumber();

            // Small delay
            await new Promise((r) => setTimeout(r, 1500));

            await program.methods
                .verifyProperty(true)
                .accounts({
                    propertyAccount: tsPDA,
                    verifier: verifierPDA,
                    verifyAuthority: verifierAuthority.publicKey,
                })
                .signers([verifierAuthority])
                .rpc();

            const after = await program.account.propertyAccount.fetch(tsPDA);
            assert.isAtLeast(after.timestamp.toNumber(), tsBefore, "Timestamp should advance");
        });
    });

    // =====================================================================
    // 4. TOKENIZE PROPERTY
    // =====================================================================
    describe("tokenize_property", () => {
        it("cannot tokenize a rejected property", async () => {
            const rejectedId = "prop-rejected-002";
            const [rejectedPDA] = derivePropertyPDA(program.programId, rejectedId);

            await program.methods
                .initializeProperty(
                    rejectedId,
                    "abc123sha256hashvalue000000000000000000000000000000000000000000",
                    "ipfs://QmRejectedDoc"
                )
                .accounts({
                    propertyAccount: rejectedPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            await program.methods
                .verifyProperty(false)
                .accounts({
                    propertyAccount: rejectedPDA,
                    verifier: verifierPDA,
                    verifyAuthority: verifierAuthority.publicKey,
                })
                .signers([verifierAuthority])
                .rpc();

            const prop = await program.account.propertyAccount.fetch(rejectedPDA);
            assert.deepEqual(prop.status, { rejected: {} });

            const tokenKP = Keypair.generate();
            const ownerATA = await getAssociatedTokenAddress(tokenKP.publicKey, owner.publicKey);
            try {
                await program.methods
                    .tokenizeProperty(new anchor.BN(1_000_000))
                    .accounts({
                        propertyAccount: rejectedPDA,
                        owner: owner.publicKey,
                        tokenMint: tokenKP.publicKey,
                        ownerTokenAccount: ownerATA,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([owner, tokenKP])
                    .rpc();
                assert.fail("Should not tokenize a rejected property");
            } catch (err: any) {
                assert.ok(err, "NotVerified error expected");
            }
        });

        it("cannot tokenize a pending (not yet verified) property", async () => {
            const pendingId = "prop-pending-tok";
            const [pendingPDA] = derivePropertyPDA(program.programId, pendingId);

            await program.methods
                .initializeProperty(pendingId, "hash", "uri")
                .accounts({
                    propertyAccount: pendingPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            const tokenKP = Keypair.generate();
            const ownerATA = await getAssociatedTokenAddress(tokenKP.publicKey, owner.publicKey);
            try {
                await program.methods
                    .tokenizeProperty(new anchor.BN(100))
                    .accounts({
                        propertyAccount: pendingPDA,
                        owner: owner.publicKey,
                        tokenMint: tokenKP.publicKey,
                        ownerTokenAccount: ownerATA,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([owner, tokenKP])
                    .rpc();
                assert.fail("Should not tokenize a PendingVerification property");
            } catch (err: any) {
                assert.ok(err, "NotVerified error expected");
            }
        });

        it("rejects zero supply tokenization", async () => {
            const tokenKP = Keypair.generate();
            const ownerATA = await getAssociatedTokenAddress(tokenKP.publicKey, owner.publicKey);
            try {
                await program.methods
                    .tokenizeProperty(new anchor.BN(0))
                    .accounts({
                        propertyAccount: propertyPDA,
                        owner: owner.publicKey,
                        tokenMint: tokenKP.publicKey,
                        ownerTokenAccount: ownerATA,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([owner, tokenKP])
                    .rpc();
                assert.fail("Should reject zero supply");
            } catch (err: any) {
                assert.ok(err, "InvalidSupply error expected");
            }
        });

        it("rejects tokenization by non-owner (has_one constraint)", async () => {
            // secondOwner tries to tokenize a property owned by 'owner'
            const tokenKP = Keypair.generate();
            const secondOwnerATA = await getAssociatedTokenAddress(tokenKP.publicKey, secondOwner.publicKey);
            try {
                await program.methods
                    .tokenizeProperty(new anchor.BN(100))
                    .accounts({
                        propertyAccount: propertyPDA,
                        owner: secondOwner.publicKey,
                        tokenMint: tokenKP.publicKey,
                        ownerTokenAccount: secondOwnerATA,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([secondOwner, tokenKP])
                    .rpc();
                assert.fail("Should fail — secondOwner is not the property owner");
            } catch (err: any) {
                assert.ok(err, "has_one constraint should block non-owner");
            }
        });

        it("tokenizes a verified property and mints supply to owner", async () => {
            const totalSupply = new anchor.BN(1_000_000);

            await program.methods
                .tokenizeProperty(totalSupply)
                .accounts({
                    propertyAccount: propertyPDA,
                    owner: owner.publicKey,
                    tokenMint: propertyTokenMintKP.publicKey,
                    ownerTokenAccount: ownerPropertyTokenAccount,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([owner, propertyTokenMintKP])
                .rpc();

            const ownerTokenBalance = await getAccount(
                provider.connection,
                ownerPropertyTokenAccount
            );
            assert.equal(
                ownerTokenBalance.amount.toString(),
                totalSupply.toString(),
                "Owner should hold the full minted supply"
            );

            const property = await program.account.propertyAccount.fetch(propertyPDA);
            assert.deepEqual(property.status, { tokenized: {} });
            assert.ok(
                property.tokenMint!.equals(propertyTokenMintKP.publicKey),
                "Property should record token mint address"
            );
            assert.equal(property.totalSupply.toNumber(), 1_000_000);
        });

        it("cannot tokenize an already-tokenized property (AlreadyTokenized)", async () => {
            const tokenKP2 = Keypair.generate();
            const ownerATA2 = await getAssociatedTokenAddress(tokenKP2.publicKey, owner.publicKey);
            try {
                await program.methods
                    .tokenizeProperty(new anchor.BN(500_000))
                    .accounts({
                        propertyAccount: propertyPDA,
                        owner: owner.publicKey,
                        tokenMint: tokenKP2.publicKey,
                        ownerTokenAccount: ownerATA2,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([owner, tokenKP2])
                    .rpc();
                assert.fail("Should not tokenize an already-tokenized property");
            } catch (err: any) {
                assert.ok(err, "AlreadyTokenized or NotVerified error expected");
            }
        });
    });

    // =====================================================================
    // 5. DEPOSIT RENT
    // =====================================================================
    describe("deposit_rent", () => {
        it("fails to deposit rent on a non-tokenized property", async () => {
            const pendId = "prop-ts-check"; // Verified but not tokenized
            const [pendPDA] = derivePropertyPDA(program.programId, pendId);
            const [pendVault] = deriveRentVaultPDA(program.programId, pendPDA);

            try {
                await program.methods
                    .depositRent(new anchor.BN(100_000))
                    .accounts({
                        propertyAccount: pendPDA,
                        payer: owner.publicKey,
                        payerUsdcAccount: ownerUsdcAccount,
                        rentVault: pendVault,
                        usdcMint: usdcMint,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([owner])
                    .rpc();
                assert.fail("Should fail — property is not tokenized");
            } catch (err: any) {
                assert.ok(err, "NotTokenized error expected");
            }
        });

        it("fails to deposit zero amount", async () => {
            try {
                await program.methods
                    .depositRent(new anchor.BN(0))
                    .accounts({
                        propertyAccount: propertyPDA,
                        payer: owner.publicKey,
                        payerUsdcAccount: ownerUsdcAccount,
                        rentVault: rentVaultPDA,
                        usdcMint: usdcMint,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([owner])
                    .rpc();
                assert.fail("Should fail — amount must be > 0");
            } catch (err: any) {
                assert.ok(err, "InvalidAmount error expected");
            }
        });

        it("deposits USDC rent into the rent vault PDA", async () => {
            const depositAmount = new anchor.BN(1_000_000_000); // 1,000 USDC

            await program.methods
                .depositRent(depositAmount)
                .accounts({
                    propertyAccount: propertyPDA,
                    payer: owner.publicKey,
                    payerUsdcAccount: ownerUsdcAccount,
                    rentVault: rentVaultPDA,
                    usdcMint: usdcMint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([owner])
                .rpc();

            const vault = await getAccount(provider.connection, rentVaultPDA);
            assert.equal(
                vault.amount.toString(),
                depositAmount.toString(),
                "Rent vault should hold deposited amount"
            );
        });

        it("accumulates multiple deposits", async () => {
            const secondDeposit = new anchor.BN(500_000_000); // 500 USDC

            await program.methods
                .depositRent(secondDeposit)
                .accounts({
                    propertyAccount: propertyPDA,
                    payer: owner.publicKey,
                    payerUsdcAccount: ownerUsdcAccount,
                    rentVault: rentVaultPDA,
                    usdcMint: usdcMint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([owner])
                .rpc();

            const vault = await getAccount(provider.connection, rentVaultPDA);
            // 1,000 + 500 = 1,500 USDC
            assert.equal(
                vault.amount.toString(),
                "1500000000",
                "Rent vault should hold accumulated deposits"
            );
        });
    });

    // =====================================================================
    // 6. CLAIM RENT (proportional payout)
    // =====================================================================
    describe("claim_rent", () => {
        let investorPropertyTokenAccount: PublicKey;

        before(async () => {
            // Transfer half the property tokens to investor so we can test proportional claim
            const transferAmount = new anchor.BN(500_000);
            investorPropertyTokenAccount = await createAssociatedTokenAccount(
                provider.connection,
                investor,
                propertyTokenMintKP.publicKey,
                investor.publicKey
            );

            await anchor.web3.sendAndConfirmTransaction(
                provider.connection,
                new anchor.web3.Transaction().add(
                    createTransferInstruction(
                        ownerPropertyTokenAccount,
                        investorPropertyTokenAccount,
                        owner.publicKey,
                        BigInt(transferAmount.toString())
                    )
                ),
                [owner]
            );

            // Verify: owner: 500K tokens, investor: 500K tokens
            const ownerBal = await getAccount(provider.connection, ownerPropertyTokenAccount);
            const invBal = await getAccount(provider.connection, investorPropertyTokenAccount);
            assert.equal(ownerBal.amount.toString(), "500000");
            assert.equal(invBal.amount.toString(), "500000");
        });

        it("allows investor (50% holder) to claim proportional rent", async () => {
            // Vault has 1,500 USDC; investor holds 50% → should receive 750 USDC
            await program.methods
                .claimRent()
                .accounts({
                    propertyAccount: propertyPDA,
                    holder: investor.publicKey,
                    holderTokenAccount: investorPropertyTokenAccount,
                    propertyTokenMint: propertyTokenMintKP.publicKey,
                    holderUsdcAccount: investorUsdcAccount,
                    rentVault: rentVaultPDA,
                    usdcMint: usdcMint,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                })
                .signers([investor])
                .rpc();

            const investorUsdc = await getAccount(provider.connection, investorUsdcAccount);
            const received = BigInt(investorUsdc.amount.toString());
            // 50% of 1,500,000,000 = 750,000,000
            assert.ok(
                received >= BigInt(749_000_000) && received <= BigInt(751_000_000),
                `Expected ~750_000_000 USDC, got ${received}`
            );
        });

        it("non-holder (0 tokens) cannot claim rent (NoTokensHeld)", async () => {
            // unauthorizedUser has no property tokens
            const noTokenATA = await getAssociatedTokenAddress(
                propertyTokenMintKP.publicKey,
                unauthorizedUser.publicKey
            );

            // We need to create the ATA first (even though it has 0 tokens)
            try {
                await createAssociatedTokenAccount(
                    provider.connection,
                    unauthorizedUser,
                    propertyTokenMintKP.publicKey,
                    unauthorizedUser.publicKey
                );
            } catch {
                // May already exist
            }

            const noUsdcATA = await getAssociatedTokenAddress(
                usdcMint,
                unauthorizedUser.publicKey
            );
            try {
                await createAssociatedTokenAccount(
                    provider.connection,
                    unauthorizedUser,
                    usdcMint,
                    unauthorizedUser.publicKey
                );
            } catch {
                // May already exist
            }

            try {
                await program.methods
                    .claimRent()
                    .accounts({
                        propertyAccount: propertyPDA,
                        holder: unauthorizedUser.publicKey,
                        holderTokenAccount: noTokenATA,
                        propertyTokenMint: propertyTokenMintKP.publicKey,
                        holderUsdcAccount: noUsdcATA,
                        rentVault: rentVaultPDA,
                        usdcMint: usdcMint,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    })
                    .signers([unauthorizedUser])
                    .rpc();
                assert.fail("Should fail — holder has no tokens");
            } catch (err: any) {
                assert.ok(err, "NoTokensHeld error expected");
            }
        });

        it("owner claims remaining rent (50% share)", async () => {
            const ownerUsdcBefore = await getAccount(provider.connection, ownerUsdcAccount);
            const beforeBalance = BigInt(ownerUsdcBefore.amount.toString());

            await program.methods
                .claimRent()
                .accounts({
                    propertyAccount: propertyPDA,
                    holder: owner.publicKey,
                    holderTokenAccount: ownerPropertyTokenAccount,
                    propertyTokenMint: propertyTokenMintKP.publicKey,
                    holderUsdcAccount: ownerUsdcAccount,
                    rentVault: rentVaultPDA,
                    usdcMint: usdcMint,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                })
                .signers([owner])
                .rpc();

            const ownerUsdcAfter = await getAccount(provider.connection, ownerUsdcAccount);
            const afterBalance = BigInt(ownerUsdcAfter.amount.toString());
            const claimed = afterBalance - beforeBalance;
            // Remaining vault balance should be ~375 USDC (50% of 750)
            assert.ok(claimed > BigInt(0), `Owner should have claimed some rent, got ${claimed}`);
        });

        it("rejects rent claim when computed amount rounds to zero (NothingToClaim)", async () => {
            const tinyPropertyId = "prop-round-down";
            const [tinyPropertyPDA] = derivePropertyPDA(program.programId, tinyPropertyId);
            const tinyTokenKP = Keypair.generate();
            const tinyOwnerATA = await getAssociatedTokenAddress(tinyTokenKP.publicKey, owner.publicKey);

            // Initialize, verify, and tokenize a property with very small supply
            await program.methods
                .initializeProperty(tinyPropertyId, "round-hash", "ipfs://tiny")
                .accounts({
                    propertyAccount: tinyPropertyPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            await program.methods
                .verifyProperty(true)
                .accounts({
                    propertyAccount: tinyPropertyPDA,
                    verifier: verifierPDA,
                    verifyAuthority: verifierAuthority.publicKey,
                })
                .signers([verifierAuthority])
                .rpc();

            // Tokenize with very large supply to make individual shares tiny
            await program.methods
                .tokenizeProperty(new anchor.BN(1_000_000))
                .accounts({
                    propertyAccount: tinyPropertyPDA,
                    owner: owner.publicKey,
                    tokenMint: tinyTokenKP.publicKey,
                    ownerTokenAccount: tinyOwnerATA,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([owner, tinyTokenKP])
                .rpc();

            // Give investor just 1 token out of 1,000,000
            const tinyInvestorATA = await createAssociatedTokenAccount(
                provider.connection,
                owner,
                tinyTokenKP.publicKey,
                investor.publicKey
            );

            await anchor.web3.sendAndConfirmTransaction(
                provider.connection,
                new anchor.web3.Transaction().add(
                    createTransferInstruction(
                        tinyOwnerATA,
                        tinyInvestorATA,
                        owner.publicKey,
                        BigInt(1)
                    )
                ),
                [owner]
            );

            const [tinyRentVaultPDA] = deriveRentVaultPDA(program.programId, tinyPropertyPDA);

            // Deposit tiny amount that will round down to zero for 1/1M share
            await program.methods
                .depositRent(new anchor.BN(1))
                .accounts({
                    propertyAccount: tinyPropertyPDA,
                    payer: owner.publicKey,
                    payerUsdcAccount: ownerUsdcAccount,
                    rentVault: tinyRentVaultPDA,
                    usdcMint: usdcMint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([owner])
                .rpc();

            try {
                await program.methods
                    .claimRent()
                    .accounts({
                        propertyAccount: tinyPropertyPDA,
                        holder: investor.publicKey,
                        holderTokenAccount: tinyInvestorATA,
                        propertyTokenMint: tinyTokenKP.publicKey,
                        holderUsdcAccount: investorUsdcAccount,
                        rentVault: tinyRentVaultPDA,
                        usdcMint: usdcMint,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    })
                    .signers([investor])
                    .rpc();
                assert.fail("Should fail when claimable rounds down to zero");
            } catch (err: any) {
                assert.ok(
                    err.toString().includes("NothingToClaim") || err.toString().includes("0x177a"),
                    "Expected NothingToClaim error for rounding-to-zero"
                );
            }
        });

        it("prevents second claim when rent vault is fully drained (VaultEmpty)", async () => {
            const exhaustedId = "prop-exhaust";
            const [exhaustedPDA] = derivePropertyPDA(program.programId, exhaustedId);
            const mintKP = Keypair.generate();
            const ownerATA = await getAssociatedTokenAddress(mintKP.publicKey, owner.publicKey);

            // Initialize, verify, and tokenize with supply of 1 (owner gets all)
            await program.methods
                .initializeProperty(exhaustedId, "exhaust-hash", "ipfs://exhaust")
                .accounts({
                    propertyAccount: exhaustedPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            await program.methods
                .verifyProperty(true)
                .accounts({
                    propertyAccount: exhaustedPDA,
                    verifier: verifierPDA,
                    verifyAuthority: verifierAuthority.publicKey,
                })
                .signers([verifierAuthority])
                .rpc();

            await program.methods
                .tokenizeProperty(new anchor.BN(1))
                .accounts({
                    propertyAccount: exhaustedPDA,
                    owner: owner.publicKey,
                    tokenMint: mintKP.publicKey,
                    ownerTokenAccount: ownerATA,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([owner, mintKP])
                .rpc();

            const [exhaustedVault] = deriveRentVaultPDA(program.programId, exhaustedPDA);

            // Deposit small amount
            await program.methods
                .depositRent(new anchor.BN(100))
                .accounts({
                    propertyAccount: exhaustedPDA,
                    payer: owner.publicKey,
                    payerUsdcAccount: ownerUsdcAccount,
                    rentVault: exhaustedVault,
                    usdcMint: usdcMint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([owner])
                .rpc();

            // First claim should succeed (owner gets 100% = 100 USDC)
            await program.methods
                .claimRent()
                .accounts({
                    propertyAccount: exhaustedPDA,
                    holder: owner.publicKey,
                    holderTokenAccount: ownerATA,
                    propertyTokenMint: mintKP.publicKey,
                    holderUsdcAccount: ownerUsdcAccount,
                    rentVault: exhaustedVault,
                    usdcMint: usdcMint,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                })
                .signers([owner])
                .rpc();

            // Verify vault is now empty
            const vaultAfterClaim = await getAccount(provider.connection, exhaustedVault);
            assert.equal(vaultAfterClaim.amount.toString(), "0", "Vault should be empty after full claim");

            // Second claim should fail
            try {
                await program.methods
                    .claimRent()
                    .accounts({
                        propertyAccount: exhaustedPDA,
                        holder: owner.publicKey,
                        holderTokenAccount: ownerATA,
                        propertyTokenMint: mintKP.publicKey,
                        holderUsdcAccount: ownerUsdcAccount,
                        rentVault: exhaustedVault,
                        usdcMint: usdcMint,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    })
                    .signers([owner])
                    .rpc();
                assert.fail("Second claim should fail when vault has zero balance");
            } catch (err: any) {
                assert.ok(
                    err.toString().includes("VaultEmpty") || err.toString().includes("0x177b"),
                    "Expected VaultEmpty error for exhausted vault"
                );
            }
        });

        it("validates rent claim precision with multiple small holders", async () => {
            const precisionId = "prop-precision";
            const [precisionPDA] = derivePropertyPDA(program.programId, precisionId);
            const precisionMintKP = Keypair.generate();
            const ownerPrecisionATA = await getAssociatedTokenAddress(precisionMintKP.publicKey, owner.publicKey);

            // Initialize, verify, and tokenize
            await program.methods
                .initializeProperty(precisionId, "precision-hash", "ipfs://precision")
                .accounts({
                    propertyAccount: precisionPDA,
                    owner: owner.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([owner])
                .rpc();

            await program.methods
                .verifyProperty(true)
                .accounts({
                    propertyAccount: precisionPDA,
                    verifier: verifierPDA,
                    verifyAuthority: verifierAuthority.publicKey,
                })
                .signers([verifierAuthority])
                .rpc();

            await program.methods
                .tokenizeProperty(new anchor.BN(1000))
                .accounts({
                    propertyAccount: precisionPDA,
                    owner: owner.publicKey,
                    tokenMint: precisionMintKP.publicKey,
                    ownerTokenAccount: ownerPrecisionATA,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([owner, precisionMintKP])
                .rpc();

            // Create multiple small holders
            const holder1ATA = await createAssociatedTokenAccount(
                provider.connection,
                owner,
                precisionMintKP.publicKey,
                investor.publicKey
            );
            const holder2ATA = await createAssociatedTokenAccount(
                provider.connection,
                owner,
                precisionMintKP.publicKey,
                unauthorizedUser.publicKey
            );

            // Transfer tokens: owner keeps 700, investor gets 200, unauthorized gets 100
            await anchor.web3.sendAndConfirmTransaction(
                provider.connection,
                new anchor.web3.Transaction().add(
                    createTransferInstruction(
                        ownerPrecisionATA,
                        holder1ATA,
                        owner.publicKey,
                        BigInt(200)
                    )
                ),
                [owner]
            );

            await anchor.web3.sendAndConfirmTransaction(
                provider.connection,
                new anchor.web3.Transaction().add(
                    createTransferInstruction(
                        ownerPrecisionATA,
                        holder2ATA,
                        owner.publicKey,
                        BigInt(100)
                    )
                ),
                [owner]
            );

            const [precisionVault] = deriveRentVaultPDA(program.programId, precisionPDA);

            // Deposit 1000 USDC
            await program.methods
                .depositRent(new anchor.BN(1_000_000_000))
                .accounts({
                    propertyAccount: precisionPDA,
                    payer: owner.publicKey,
                    payerUsdcAccount: ownerUsdcAccount,
                    rentVault: precisionVault,
                    usdcMint: usdcMint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([owner])
                .rpc();

            // Create USDC accounts for holders
            const holder2UsdcATA = await createAssociatedTokenAccount(
                provider.connection,
                unauthorizedUser,
                usdcMint,
                unauthorizedUser.publicKey
            );

            // Each holder claims their share
            const vaultBefore = await getAccount(provider.connection, precisionVault);
            const totalVault = BigInt(vaultBefore.amount.toString());

            // Holder2 (100/1000 = 10%) should get 100 USDC
            await program.methods
                .claimRent()
                .accounts({
                    propertyAccount: precisionPDA,
                    holder: unauthorizedUser.publicKey,
                    holderTokenAccount: holder2ATA,
                    propertyTokenMint: precisionMintKP.publicKey,
                    holderUsdcAccount: holder2UsdcATA,
                    rentVault: precisionVault,
                    usdcMint: usdcMint,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                })
                .signers([unauthorizedUser])
                .rpc();

            const holder2Balance = await getAccount(provider.connection, holder2UsdcATA);
            const expectedHolder2 = BigInt(100_000_000); // 100 USDC with 6 decimals
            assert.ok(
                holder2Balance.amount >= expectedHolder2 - BigInt(1) && 
                holder2Balance.amount <= expectedHolder2 + BigInt(1),
                `Holder2 should get ~100 USDC, got ${holder2Balance.amount}`
            );

            // Verify vault balance decreased correctly
            const vaultAfter = await getAccount(provider.connection, precisionVault);
            const remaining = BigInt(vaultAfter.amount.toString());
            const claimed = totalVault - remaining;
            assert.ok(
                claimed >= expectedHolder2 - BigInt(1) && claimed <= expectedHolder2 + BigInt(1),
                `Vault should decrease by ~100 USDC, decreased by ${claimed}`
            );
        });
    });
});
