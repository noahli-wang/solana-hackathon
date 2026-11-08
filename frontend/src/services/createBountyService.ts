
import { AnchorProvider, BN, Program } from "@anchor-lang/core";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  type Connection,
} from "@solana/web3.js";

import idl from "../solana/bounty_board.json";
import type { BountyBoard } from "../solana/bounty_board";

export interface CreateBountyInput {
  title: string;
  description: string;
  rewardSol: string;
  deadline: number;
}

export interface CreatedBounty {
  signature: string;
  address: string;
}

const PROGRAM_ID = new PublicKey(
  "DorphgTj2n5swnnt53Edymkds7P1MDjoKfQRRNC79weT"
);

const MAX_U64 = (1n << 64n) - 1n;

// Convert SOL into lamports without floating-point rounding.
function solToLamports(value: string): bigint {
  const trimmed = value.trim();

  if (!/^\d+(\.\d{1,9})?$/.test(trimmed)) {
    throw new Error(
      "Enter a valid SOL amount with up to 9 decimal places."
    );
  }

  const [whole, fraction = ""] = trimmed.split(".");

  const lamports =
    BigInt(whole) * 1_000_000_000n +
    BigInt(fraction.padEnd(9, "0"));

  if (lamports <= 0n) {
    throw new Error("Bounty reward must be greater than 0 SOL.");
  }

  if (lamports > MAX_U64) {
    throw new Error("Bounty reward exceeds the supported amount.");
  }

  return lamports;
}

export async function createBounty(
  connection: Connection,
  wallet: AnchorWallet,
  input: CreateBountyInput
): Promise<CreatedBounty> {
  // Keep bounty creation explicitly enabled for this frontend.
  if (
    import.meta.env.VITE_ENABLE_BOUNTY_CREATION !== "true"
  ) {
    throw new Error(
      "Bounty creation is disabled until the deployed contract is verified."
    );
  }

  if (!wallet.publicKey) {
    throw new Error("Connect your Phantom wallet first.");
  }

  // Confirm that the frontend is connected to Devnet.
 const genesisHash = await connection.getGenesisHash();

    if (
    genesisHash !==
    "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
    ) {
    throw new Error(
        "Bounty creation is currently restricted to Solana Devnet."
    );
    }

  const encoder = new TextEncoder();

  const title = input.title.trim();
  const description = input.description.trim();

  // Validate title.
  const titleBytes = encoder.encode(title).length;

  if (titleBytes < 1 || titleBytes > 64) {
    throw new Error(
      "Title must contain between 1 and 64 bytes."
    );
  }

  // Validate description.
  const descriptionBytes = encoder.encode(description).length;

  if (descriptionBytes < 1 || descriptionBytes > 200) {
    throw new Error(
      "Description must contain between 1 and 200 bytes."
    );
  }

  // Convert reward to lamports.
  // No artificial 0.01 SOL testing limit.
  const rewardLamports = solToLamports(input.rewardSol);

  // Check that the deadline is in the future.
  const deadline = input.deadline;

  if (
    !Number.isSafeInteger(deadline) ||
    deadline <= Math.floor(Date.now() / 1000)
  ) {
    throw new Error(
      "Deadline must be a valid future date."
    );
  }

  // Initialize Anchor provider.
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Initialize the BountyBoard program.
  const program = new Program<BountyBoard>(
    idl as BountyBoard,
    provider
  );

  if (!program.programId.equals(PROGRAM_ID)) {
    throw new Error(
      "The configured program ID does not match BountyBoard."
    );
  }

  // Generate a unique bounty ID using current time.
  const bountyId = new BN(Date.now().toString());

  // Derive the bounty PDA.
  const [bountyPda] = PublicKey.findProgramAddressSync(
    [
      encoder.encode("bounty"),
      wallet.publicKey.toBuffer(),
      Uint8Array.from(bountyId.toArray("le", 8)),
    ],
    PROGRAM_ID
  );

  // Avoid attempting to create a bounty at an existing PDA.
  const existingAccount = await connection.getAccountInfo(
    bountyPda
  );

  if (existingAccount !== null) {
    throw new Error(
      "This bounty ID already exists. Please try again."
    );
  }

  // Create the bounty on Solana Devnet.
  // The reward is deposited into the bounty PDA's escrow.
  const signature = await program.methods
    .createBounty(
      bountyId,
      title,
      description,
      new BN(rewardLamports.toString()),
      new BN(deadline)
    )
    .accountsPartial({
      bounty: bountyPda,
      creator: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return {
    signature,
    address: bountyPda.toBase58(),
  };
}
