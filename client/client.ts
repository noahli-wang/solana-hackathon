
import * as anchor from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import type { HelloAnchor } from "../target/types/hello_anchor";

// Main function for interacting with the Solana blockchain.
async function main() {

    // Connect to the configured Solana network and wallet.
    const provider = anchor.AnchorProvider.env();

    // Set the provider for Anchor to use.
    anchor.setProvider(provider);

    // Get our HelloAnchor program.
    const program = anchor.workspace.HelloAnchor as anchor.Program<HelloAnchor>;

    // Display the wallet's public address.
    console.log(
        "My address:",
        provider.wallet.publicKey.toString()
    );

    // Retrieve the wallet's current balance in lamports.
    const balance = await provider.connection.getBalance(
        provider.wallet.publicKey
    );

    // Convert lamports into SOL and display the balance.
    console.log(
        `My balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`
    );

    // Program is available here for future contract interactions.
    console.log("Program ID:", program.programId.toString());
}

// Execute the main function and catch any errors.
main().catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
});
