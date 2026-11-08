
import { Layers3, Wallet } from "lucide-react";
import "./Layout.css";

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <Layers3 size={22} />
        </div>

        <span>BountyBoard</span>
      </div>

      <button className="wallet-button" type="button" disabled>
        <Wallet size={18} />
        Connect Wallet
      </button>
    </header>
  );
}
