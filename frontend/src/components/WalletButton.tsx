
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import "./WalletButton.css";

// Handles wallet selection, connection and disconnection.
export default function WalletButton() {
  return (
    <div className="bounty-wallet-container">
      <WalletMultiButton />
    </div>
  );
}
