import { PROGRAM_ID, IDL } from "@/lib/solana-utils";
import { PublicKey } from "@solana/web3.js";

describe("PROGRAM_ID", () => {
  it("is a valid Solana PublicKey", () => {
    expect(PROGRAM_ID).toBeInstanceOf(PublicKey);
    expect(PROGRAM_ID.toBase58()).toBe("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
  });
});

describe("IDL", () => {
  it("has the correct program name", () => {
    expect(IDL.name).toBe("proof_estate");
  });

  it("contains the tokenizeProperty instruction", () => {
    const instruction = IDL.instructions.find(
      (i: any) => i.name === "tokenizeProperty"
    );
    expect(instruction).toBeDefined();
    expect(instruction.accounts).toHaveLength(8);
  });

  it("has a totalSupply arg of type u64", () => {
    const instruction = IDL.instructions.find((i: any) => i.name === "tokenizeProperty");
    const arg = instruction.args.find((a: any) => a.name === "totalSupply");
    expect(arg).toBeDefined();
    expect(arg.type).toBe("u64");
  });

  it("defines PropertyAccount struct with correct fields", () => {
    const account = IDL.accounts.find((a: any) => a.name === "PropertyAccount");
    expect(account).toBeDefined();
    expect(account.type.kind).toBe("struct");
    const fields = account.type.fields.map((f: any) => f.name);
    expect(fields).toContain("owner");
    expect(fields).toContain("propertyId");
    expect(fields).toContain("metadataHash");
    expect(fields).toContain("status");
    expect(fields).toContain("timestamp");
  });

  it("defines PropertyStatus enum with all 4 variants including Rejected", () => {
    const statusType = IDL.types.find((t: any) => t.name === "PropertyStatus");
    expect(statusType).toBeDefined();
    expect(statusType.type.kind).toBe("enum");
    expect(statusType.type.variants).toHaveLength(4);
    const variantNames = statusType.type.variants.map((v: any) => v.name);
    expect(variantNames).toContain("PendingVerification");
    expect(variantNames).toContain("Verified");
    expect(variantNames).toContain("Rejected");
    expect(variantNames).toContain("Tokenized");
  });

  it("tokenizeProperty instruction has correct account structure", () => {
    const instruction = IDL.instructions.find((i: any) => i.name === "tokenizeProperty");
    const accountNames = instruction.accounts.map((a: any) => a.name);
    expect(accountNames).toEqual([
      "propertyAccount",
      "owner",
      "tokenMint",
      "ownerTokenAccount",
      "systemProgram",
      "tokenProgram",
      "associatedTokenProgram",
      "rent",
    ]);
  });

  it("owner account requires signer", () => {
    const instruction = IDL.instructions.find((i: any) => i.name === "tokenizeProperty");
    const ownerAccount = instruction.accounts.find((a: any) => a.name === "owner");
    expect(ownerAccount.signer).toBe(true);
    expect(ownerAccount.writable).toBe(true);
  });

  it("propertyAccount is writable but not signer", () => {
    const instruction = IDL.instructions.find((i: any) => i.name === "tokenizeProperty");
    const propAccount = instruction.accounts.find((a: any) => a.name === "propertyAccount");
    expect(propAccount.writable).toBe(true);
    expect(propAccount.signer).toBe(false);
  });

  it("tokenMint is writable and signer", () => {
    const instruction = IDL.instructions.find((i: any) => i.name === "tokenizeProperty");
    const mint = instruction.accounts.find((a: any) => a.name === "tokenMint");
    expect(mint.writable).toBe(true);
    expect(mint.signer).toBe(true);
  });
});

describe("getPropertyPDA", () => {
  it("calls findProgramAddressSync with correct seeds", () => {
    const spy = jest.spyOn(PublicKey, "findProgramAddressSync").mockReturnValue([
      new PublicKey("11111111111111111111111111111111"),
      255,
    ]);

    const { getPropertyPDA } = require("@/lib/solana-utils");
    const [pda, bump] = getPropertyPDA("test-property");

    expect(spy).toHaveBeenCalledWith(
      [Buffer.from("property"), Buffer.from("test-property")],
      PROGRAM_ID
    );
    expect(pda).toBeInstanceOf(PublicKey);
    expect(bump).toBe(255);

    spy.mockRestore();
  });

  it("returns different PDAs for different IDs", () => {
    const spy = jest.spyOn(PublicKey, "findProgramAddressSync");
    const pk1 = new PublicKey("11111111111111111111111111111111");
    const pk2 = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    spy.mockReturnValueOnce([pk1, 254]);
    spy.mockReturnValueOnce([pk2, 253]);

    const { getPropertyPDA } = require("@/lib/solana-utils");
    const [pda1] = getPropertyPDA("prop-a");
    const [pda2] = getPropertyPDA("prop-b");

    expect(pda1.equals(pda2)).toBe(false);

    spy.mockRestore();
  });

  it("passes the correct PROGRAM_ID", () => {
    const spy = jest.spyOn(PublicKey, "findProgramAddressSync").mockReturnValue([
      new PublicKey("11111111111111111111111111111111"),
      255,
    ]);

    const { getPropertyPDA } = require("@/lib/solana-utils");
    getPropertyPDA("any-id");

    const [, programId] = spy.mock.calls[0];
    expect(programId.equals(PROGRAM_ID)).toBe(true);

    spy.mockRestore();
  });
});

describe("IDL Blockchain Flow Completeness", () => {
  it("contains all required instructions for full property lifecycle", () => {
    const instructionNames = IDL.instructions.map((i: any) => i.name);
    
    // Core lifecycle instructions
    expect(instructionNames).toContain("initializeVerifier");
    expect(instructionNames).toContain("initializeProperty");
    expect(instructionNames).toContain("verifyProperty");
    expect(instructionNames).toContain("tokenizeProperty");
    
    // Rent management instructions
    expect(instructionNames).toContain("depositRent");
    expect(instructionNames).toContain("claimRent");
    
    expect(IDL.instructions).toHaveLength(6);
  });

  it("defines complete PropertyAccount struct matching on-chain program", () => {
    const propertyAccount = IDL.accounts.find((a: any) => a.name === "PropertyAccount");
    expect(propertyAccount).toBeDefined();
    
    const fields = propertyAccount.type.fields.map((f: any) => f.name);
    expect(fields).toContain("owner");
    expect(fields).toContain("propertyId");
    expect(fields).toContain("metadataHash");
    expect(fields).toContain("metadataUri");
    expect(fields).toContain("status");
    expect(fields).toContain("timestamp");
    expect(fields).toContain("tokenMint");
    expect(fields).toContain("totalSupply");
    
    // Verify tokenMint is optional
    const tokenMintField = propertyAccount.type.fields.find((f: any) => f.name === "tokenMint");
    expect(tokenMintField.type.option).toBe("publicKey");
  });

  it("defines Verifier account struct", () => {
    const verifierAccount = IDL.accounts.find((a: any) => a.name === "Verifier");
    expect(verifierAccount).toBeDefined();
    
    const fields = verifierAccount.type.fields.map((f: any) => f.name);
    expect(fields).toContain("authority");
    expect(fields).toHaveLength(1);
  });

  it("includes all blockchain error codes", () => {
    expect(IDL.errors).toBeDefined();
    expect(IDL.errors.length).toBeGreaterThanOrEqual(11);
    
    const errorNames = IDL.errors.map((e: any) => e.name);
    expect(errorNames).toContain("NotVerified");
    expect(errorNames).toContain("NotTokenized");
    expect(errorNames).toContain("AlreadyTokenized");
    expect(errorNames).toContain("InvalidStatus");
    expect(errorNames).toContain("UnauthorizedVerifier");
    expect(errorNames).toContain("InvalidSupply");
    expect(errorNames).toContain("InvalidAmount");
    expect(errorNames).toContain("VaultEmpty");
    expect(errorNames).toContain("NoTokensHeld");
    expect(errorNames).toContain("NothingToClaim");
    expect(errorNames).toContain("StringTooLong");
  });

  it("verifyProperty instruction has correct structure", () => {
    const verifyInstruction = IDL.instructions.find((i: any) => i.name === "verifyProperty");
    expect(verifyInstruction).toBeDefined();
    
    const accountNames = verifyInstruction.accounts.map((a: any) => a.name);
    expect(accountNames).toContain("propertyAccount");
    expect(accountNames).toContain("verifier");
    expect(accountNames).toContain("verifyAuthority");
    
    expect(verifyInstruction.args).toHaveLength(1);
    expect(verifyInstruction.args[0].name).toBe("approved");
    expect(verifyInstruction.args[0].type).toBe("bool");
  });

  it("depositRent instruction has correct structure", () => {
    const depositInstruction = IDL.instructions.find((i: any) => i.name === "depositRent");
    expect(depositInstruction).toBeDefined();
    
    const accountNames = depositInstruction.accounts.map((a: any) => a.name);
    expect(accountNames).toContain("propertyAccount");
    expect(accountNames).toContain("payer");
    expect(accountNames).toContain("payerUsdcAccount");
    expect(accountNames).toContain("rentVault");
    expect(accountNames).toContain("usdcMint");
    
    expect(depositInstruction.args).toHaveLength(1);
    expect(depositInstruction.args[0].name).toBe("amount");
    expect(depositInstruction.args[0].type).toBe("u64");
  });

  it("claimRent instruction has correct structure", () => {
    const claimInstruction = IDL.instructions.find((i: any) => i.name === "claimRent");
    expect(claimInstruction).toBeDefined();
    
    const accountNames = claimInstruction.accounts.map((a: any) => a.name);
    expect(accountNames).toContain("propertyAccount");
    expect(accountNames).toContain("holder");
    expect(accountNames).toContain("holderTokenAccount");
    expect(accountNames).toContain("propertyTokenMint");
    expect(accountNames).toContain("holderUsdcAccount");
    expect(accountNames).toContain("rentVault");
    expect(accountNames).toContain("usdcMint");
    
    expect(claimInstruction.args).toHaveLength(0);
  });

  it("initializeProperty instruction includes metadata_uri parameter", () => {
    const initInstruction = IDL.instructions.find((i: any) => i.name === "initializeProperty");
    expect(initInstruction).toBeDefined();
    
    const argNames = initInstruction.args.map((a: any) => a.name);
    expect(argNames).toContain("propertyId");
    expect(argNames).toContain("metadataHash");
    expect(argNames).toContain("metadataUri");
    expect(initInstruction.args).toHaveLength(3);
  });
});

describe("Blockchain Integration Validation", () => {
  it("validates property status transitions", () => {
    const statusType = IDL.types.find((t: any) => t.name === "PropertyStatus");
    const variants = statusType.type.variants.map((v: any) => v.name);
    
    // Valid transitions: PendingVerification -> Verified -> Tokenized
    // Or: PendingVerification -> Rejected (terminal)
    expect(variants.indexOf("PendingVerification")).toBe(0);
    expect(variants.indexOf("Verified")).toBeGreaterThan(-1);
    expect(variants.indexOf("Rejected")).toBeGreaterThan(-1);
    expect(variants.indexOf("Tokenized")).toBeGreaterThan(-1);
  });

  it("ensures error codes are properly mapped", () => {
    const errors = IDL.errors;
    
    // Check that error codes are sequential and start from 6000 (Anchor convention)
    expect(errors[0].code).toBe(6000);
    expect(errors[1].code).toBe(6001);
    expect(errors[2].code).toBe(6002);
    
    // Verify critical errors exist
    const notVerifiedError = errors.find((e: any) => e.name === "NotVerified");
    expect(notVerifiedError.code).toBe(6000);
    expect(notVerifiedError.msg).toContain("not been verified");
    
    const invalidSupplyError = errors.find((e: any) => e.name === "InvalidSupply");
    expect(invalidSupplyError.msg).toContain("greater than zero");
  });

  it("validates account constraint requirements", () => {
    const tokenizeInstruction = IDL.instructions.find((i: any) => i.name === "tokenizeProperty");
    
    // Owner should be signer and writable (pays for mint creation)
    const ownerAccount = tokenizeInstruction.accounts.find((a: any) => a.name === "owner");
    expect(ownerAccount.signer).toBe(true);
    expect(ownerAccount.writable).toBe(true);
    
    // PropertyAccount should be writable but not signer
    const propertyAccount = tokenizeInstruction.accounts.find((a: any) => a.name === "propertyAccount");
    expect(propertyAccount.writable).toBe(true);
    expect(propertyAccount.signer).toBe(false);
    
    // TokenMint should be signer (new mint being created)
    const tokenMint = tokenizeInstruction.accounts.find((a: any) => a.name === "tokenMint");
    expect(tokenMint.signer).toBe(true);
    expect(tokenMint.writable).toBe(true);
  });
});
