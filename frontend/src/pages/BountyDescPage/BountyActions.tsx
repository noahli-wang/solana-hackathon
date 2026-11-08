import { Bookmark, Handshake } from "lucide-react";

import type { BountyStatus } from "../../types/bounty";

interface BountyActionsProps {
  status: BountyStatus;
  acceptedByMe: boolean;
  isBookmarked: boolean;
  onAccept: () => void;
  onBookmark: () => void;
}

// "Accept Bounty" and "Bookmark" buttons
export default function BountyActions({
  status,
  acceptedByMe,
  isBookmarked,
  onAccept,
  onBookmark,
}: BountyActionsProps) {
  const canAccept = status === "Open";

  let acceptLabel: string = status;
  if (canAccept) acceptLabel = "Accept Bounty";
  else if (acceptedByMe) acceptLabel = "Accepted";

  return (
    <div className="details-actions">
      <button
        type="button"
        className="accept-button"
        onClick={onAccept}
        disabled={!canAccept}
      >
        <Handshake size={18} />
        {acceptLabel}
      </button>

      <button
        type="button"
        className={`details-bookmark-button ${
          isBookmarked ? "bookmarked" : ""
        }`}
        aria-pressed={isBookmarked}
        onClick={onBookmark}
      >
        <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
        {isBookmarked ? "Bookmarked" : "Bookmark"}
      </button>
    </div>
  );
}
