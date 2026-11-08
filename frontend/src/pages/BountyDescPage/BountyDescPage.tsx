import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import type { Bounty, BountyStatus } from "../../types/bounty";
import BountyMeta from "./BountyMeta";
import BountyDescriptionCard from "./BountyDescriptionCard";
import BountyActions from "./BountyActions";
import SubmissionPanel from "./SubmissionPanel";
import ProgressNotes from "./ProgressNotes";

// Shared status badge + tag styles live with the board
import "../BrowsePage/BrowsePage.css";
import "./BountyDescPage.css";

interface BountyDescPageProps {
  bounty: Bounty;
  isBookmarked: boolean;
  onBookmark: (id: string) => void;
  onBack: () => void;
}

// Full "Bounty Details" page (wireframe #2)
export default function BountyDescPage({
  bounty,
  isBookmarked,
  onBookmark,
  onBack,
}: BountyDescPageProps) {
  // Local (mock) state until these actions are wired to the Solana program
  const [status, setStatus] = useState<BountyStatus>(bounty.status);
  const [acceptedByMe, setAcceptedByMe] = useState(false);
  const [submittedLink, setSubmittedLink] = useState<string | null>(
    bounty.submissionRef
  );

  // Start at the top of the page when opening a bounty
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [bounty.id]);

  function acceptBounty() {
    setStatus("Accepted");
    setAcceptedByMe(true);
  }

  function submitWork(link: string) {
    setSubmittedLink(link);
    setStatus("Submitted");
  }

  return (
    <main className="details-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Board
      </button>

      <h1 className="details-page-title">Bounty Details</h1>

      <div className="details-layout">
        {/* Left column: bounty information */}
        <section className="details-main">
          <BountyMeta bounty={bounty} status={status} />
          <BountyDescriptionCard bounty={bounty} />
          <BountyActions
            status={status}
            acceptedByMe={acceptedByMe}
            isBookmarked={isBookmarked}
            onAccept={acceptBounty}
            onBookmark={() => onBookmark(bounty.id)}
          />
        </section>

        {/* Right column: submission and progress */}
        <aside className="progress-panel">
          <SubmissionPanel
            status={status}
            acceptedByMe={acceptedByMe}
            submittedLink={submittedLink}
            onSubmit={submitWork}
          />
          <ProgressNotes />
        </aside>
      </div>
    </main>
  );
}
