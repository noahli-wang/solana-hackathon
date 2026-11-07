
import { Bookmark, CalendarDays } from "lucide-react";
import type { Bounty } from "../../types/bounty";

interface BountyCardProps {
  bounty: Bounty;
  isBookmarked: boolean;
  onBookmark: (id: string) => void;
  onViewDetails: (bounty: Bounty) => void;
  onTagClick: (tag: string) => void;
}

export default function BountyCard({
  bounty,
  isBookmarked,
  onBookmark,
  onViewDetails,
  onTagClick,
}: BountyCardProps) {
  const reward = Number(bounty.rewardLamports) / 1_000_000_000;

  const deadline = new Date(
    bounty.deadline * 1000
  ).toLocaleDateString();

  return (
    <article className="bounty-card">
      <div className="bounty-card-header">
        <h3>{bounty.title}</h3>

        <button
          type="button"
          className={`bookmark-button ${
            isBookmarked ? "bookmarked" : ""
          }`}
          aria-label={
            isBookmarked ? "Remove bookmark" : "Bookmark bounty"
          }
          aria-pressed={isBookmarked}
          onClick={() => onBookmark(bounty.id)}
        >
          <Bookmark
            size={19}
            fill={isBookmarked ? "currentColor" : "none"}
          />
        </button>
      </div>

      <span
        className={`bounty-status status-${bounty.status.toLowerCase()}`}
      >
        {bounty.status}
      </span>

      <p className="bounty-description">
        {bounty.descriptionRef}
      </p>

      <div className="bounty-tags">
        {bounty.tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="bounty-tag"
            onClick={() => onTagClick(tag)}
            title={`Filter by ${tag}`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="bounty-card-footer">
        <div className="bounty-metadata">
          <strong>{reward} SOL</strong>

          <span className="deadline-label">
            <CalendarDays size={15} />
            {deadline}
          </span>
        </div>

        <button
          type="button"
          className="view-details-button"
          onClick={() => onViewDetails(bounty)}
        >
          View Details
        </button>
      </div>
    </article>
  );
}
