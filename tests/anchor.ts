
import * as anchor from "@anchor-lang/core";
import type { SolanaHackathonNew } from "../target/types/solana_hackathon_new";

describe("solana-hackathon-new", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .SolanaHackathonNew as anchor.Program<SolanaHackathonNew>;

  it("initializes", async () => {
    const txHash = await program.methods.initialize().rpc();

    console.log("Transaction:", txHash);
  });
});
