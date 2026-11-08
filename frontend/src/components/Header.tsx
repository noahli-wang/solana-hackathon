
import { Layers3 } from "lucide-react";

import WalletButton from "./WalletButton";
import "./Layout.css";

// Shared navigation header for BountyBoard.
export default function Header() {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <Layers3 size={22} />
        </div>

        <span>BountyBoard</span>
      </div>

      <WalletButton />
    </header>
  );
}
