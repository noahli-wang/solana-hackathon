
import * as anchor from "@anchor-lang/core";
import type { BountyBoard } from "../target/types/bounty_board";

describe("bounty-board", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .BountyBoard as anchor.Program<BountyBoard>;

  it("initializes", async () => {
    const txHash = await program.methods.initialize().rpc();

    console.log("Transaction:", txHash);
  });
});
