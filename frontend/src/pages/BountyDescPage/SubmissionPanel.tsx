import { useState } from "react";
import type { FormEvent } from "react";
import { FileText, Upload } from "lucide-react";

import type { BountyStatus } from "../../types/bounty";
import { getProgressMessage } from "./bountyFormat";

interface SubmissionPanelProps {
  status: BountyStatus;
  acceptedByMe: boolean;
  submittedLink: string | null;
  onSubmit: (link: string) => void;
}

// "Submission / Progress" section of the right-hand panel
export default function SubmissionPanel({
  status,
  acceptedByMe,
  submittedLink,
  onSubmit,
}: SubmissionPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [link, setLink] = useState("");

  const canSubmit = acceptedByMe && status === "Accepted";
  const progress = getProgressMessage(status, acceptedByMe);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = link.trim();
    if (!trimmed) return;

    onSubmit(trimmed);
    setShowForm(false);
  }

  return (
    <div className="progress-section">
      <h3 className="panel-heading">
        <FileText size={18} />
        Submission / Progress
      </h3>

      <p className="progress-title">{progress.title}</p>
      <p className="progress-body">{progress.body}</p>

      {submittedLink && (
        <p className="submitted-link">
          Submission:{" "}
          <a href={submittedLink} target="_blank" rel="noreferrer">
            {submittedLink}
          </a>
        </p>
      )}

      {showForm && canSubmit ? (
        <form className="submit-form" onSubmit={handleSubmit}>
          <input
            type="url"
            required
            placeholder="Link to your work (GitHub, docs...)"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            autoFocus
          />
          <div className="submit-form-actions">
            <button
              type="button"
              className="panel-secondary-button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="panel-primary-button"
              disabled={!link.trim()}
            >
              Submit
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="submit-work-button"
          disabled={!canSubmit}
          onClick={() => setShowForm(true)}
        >
          <Upload size={16} />
          Submit Work
        </button>
      )}
    </div>
  );
}
