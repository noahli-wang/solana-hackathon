
import { Program } from "@anchor-lang/core";
import type { Connection } from "@solana/web3.js";

import idl from "../solana/bounty_board.json";
import type { BountyBoard } from "../solana/bounty_board";

/**
 * Creates a read-only connection to the BountyBoard program.
 *
 * No wallet signature is needed to read accounts.
 */
export function getBountyProgram(
  connection: Connection
): Program<BountyBoard> {
  return new Program<BountyBoard>(
    idl as BountyBoard,
    { connection }
  );
}

/**
 * Fetches all bounty accounts from the deployed program.
 */
export async function getAllBounties(
  connection: Connection
) {
  const program = getBountyProgram(connection);

  return await program.account.bounty.all();
}
