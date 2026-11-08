import { useState } from "react";
import { CalendarDays, Check, Coins, Copy, UserRound } from "lucide-react";

import type { Bounty, BountyStatus } from "../../types/bounty";
import { formatDeadline, formatSol } from "./bountyFormat";

interface BountyMetaProps {
  bounty: Bounty;
  status: BountyStatus;
}

// Title, reward / status / deadline row, and "Created by"
export default function BountyMeta({ bounty, status }: BountyMetaProps) {
  const [copied, setCopied] = useState(false);

  async function copyCreator() {
    try {
      await navigator.clipboard.writeText(bounty.creator);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (e.g. non-secure context); ignore
    }
  }

  return (
    <>
      <h2 className="details-bounty-title">{bounty.title}</h2>

      <div className="details-meta-row">
        <span className="meta-chip">
          <Coins size={16} />
          {formatSol(bounty.rewardLamports)} SOL
        </span>

        <span className={`bounty-status status-${status.toLowerCase()}`}>
          {status}
        </span>

        <span className="meta-chip">
          <CalendarDays size={16} />
          Deadline: {formatDeadline(bounty.deadline)}
        </span>
      </div>

      <div className="details-creator">
        <UserRound size={16} />
        <span>
          Created by: <strong>{bounty.creator}</strong>
        </span>
        <button
          type="button"
          className="copy-button"
          onClick={copyCreator}
          aria-label="Copy creator address"
          title={copied ? "Copied!" : "Copy address"}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </>
  );
}
