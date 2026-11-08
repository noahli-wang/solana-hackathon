
import { ArrowLeft, Bookmark, CalendarDays, Coins } from "lucide-react";
import type { Bounty } from "../../types/bounty";
import "./BountyDetails.css";

interface Props {
  bounty: Bounty;
  saved: boolean;
  onBack: () => void;
  onBookmark: () => void;
}

export default function BountyDetails({
  bounty,
  saved,
  onBack,
  onBookmark,
}: Props) {
  // Convert lamports to SOL.
  const reward =
    Number(bounty.rewardLamports) / 1_000_000_000;

  // Convert Unix timestamp to a readable date.
  const deadline = new Date(
    bounty.deadline * 1000
  ).toLocaleDateString();

  return (
    <main className="bounty-details">
      {/* Back navigation */}
      <button
        type="button"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Back to My Bounties
      </button>

      {/* Bounty title */}
      <h1>{bounty.title}</h1>

      {/* Current status */}
      <span
        className={`mb-status mb-status-${bounty.status.toLowerCase()}`}
      >
        {bounty.status}
      </span>

      {/* Description */}
      <p>{bounty.descriptionRef}</p>

      {/* Reward */}
      <div className="bounty-reward">
        <Coins size={18} />
        <strong>{reward} SOL</strong>
      </div>

      {/* Deadline */}
      <div className="bounty-deadline">
        <CalendarDays size={18} />
        <strong>Deadline:</strong> {deadline}
      </div>

      {/* Tags */}
      {bounty.tags.length > 0 && (
        <div className="bounty-tags">
          {bounty.tags.map((tag) => (
            <span
              key={tag}
              className="bounty-tag"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Bookmark action */}
      <button
        type="button"
        onClick={onBookmark}
        aria-pressed={saved}
      >
        <Bookmark
          size={18}
          fill={saved ? "currentColor" : "none"}
        />
        {saved ? "Remove Bookmark" : "Bookmark"}
      </button>
    </main>
  );
}
