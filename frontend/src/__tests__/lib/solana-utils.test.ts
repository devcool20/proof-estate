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
    const instruction = IDL.instructions[0];
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

  it("defines PropertyStatus enum with 3 variants", () => {
    const statusType = IDL.types.find((t: any) => t.name === "PropertyStatus");
    expect(statusType).toBeDefined();
    expect(statusType.type.kind).toBe("enum");
    expect(statusType.type.variants).toHaveLength(3);
    const variantNames = statusType.type.variants.map((v: any) => v.name);
    expect(variantNames).toContain("PendingVerification");
    expect(variantNames).toContain("Verified");
    expect(variantNames).toContain("Tokenized");
  });

  it("tokenizeProperty instruction has correct account structure", () => {
    const instruction = IDL.instructions[0];
    const accountNames = instruction.accounts.map((a: any) => a.name);
    expect(accountNames).toEqual([
      "propertyAccount",
      "owner",
      "tokenMint",
      "ownerTokenAccount",
      "systemProgram",
      "tokenProgram",
      "rent",
      "associatedTokenProgram",
    ]);
  });

  it("owner account requires signer", () => {
    const instruction = IDL.instructions[0];
    const ownerAccount = instruction.accounts.find((a: any) => a.name === "owner");
    expect(ownerAccount.signer).toBe(true);
    expect(ownerAccount.writable).toBe(true);
  });

  it("propertyAccount is writable but not signer", () => {
    const instruction = IDL.instructions[0];
    const propAccount = instruction.accounts.find((a: any) => a.name === "propertyAccount");
    expect(propAccount.writable).toBe(true);
    expect(propAccount.signer).toBe(false);
  });

  it("tokenMint is writable and signer", () => {
    const instruction = IDL.instructions[0];
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
