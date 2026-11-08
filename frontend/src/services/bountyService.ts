import { Program } from "@anchor-lang/core";
import type { Connection } from "@solana/web3.js";

import idl from "../solana/bounty_board.json";
import type { BountyBoard } from "../solana/bounty_board";
import type { Bounty, BountyStatus } from "../types/bounty";

export function getBountyProgram(
  connection: Connection
): Program<BountyBoard> {
  return new Program<BountyBoard>(
    idl as BountyBoard,
    { connection }
  );
}

const STATUSES: BountyStatus[] = [
  "Open",
  "Accepted",
  "Submitted",
  "Completed",
  "Cancelled",
];

function parseStatus(
  status: Record<string, unknown>
): BountyStatus {
  const name = Object.keys(status)[0];

  return (
    STATUSES.find(
      (value) =>
        value.toLowerCase() === name?.toLowerCase()
    ) ?? "Open"
  );
}

/**
 * Fetch real bounty accounts and convert them into
 * the data model used by our React components.
 */
export async function getAllBounties(
  connection: Connection
): Promise<Bounty[]> {
  const program = getBountyProgram(connection);

  const accounts = await program.account.bounty.all();

  return accounts.map(({ publicKey, account }) => ({
    // Use the actual Solana account address as the ID.
    id: publicKey.toBase58(),

    creator: account.creator.toBase58(),

    worker: account.worker
      ? account.worker.toBase58()
      : null,

    title: account.title,
    descriptionRef: account.descriptionRef,

    rewardLamports: BigInt(
      account.rewardLamports.toString()
    ),

    deadline: Number(account.deadline.toString()),

    status: parseStatus(
      account.status as Record<string, unknown>
    ),

    submissionRef: account.submissionRef,

    // Tags aren't currently stored in the Bounty account.
    tags: [],
  }));
}
