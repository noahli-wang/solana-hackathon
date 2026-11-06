
import * as anchor from "@coral-xyz/anchor";

// Migration script for deploying the Anchor program.
module.exports = async function (
    provider: anchor.AnchorProvider
) {
    // Configure the Anchor client to use this provider.
    anchor.setProvider(provider);

    // Add your deployment logic here.
};
