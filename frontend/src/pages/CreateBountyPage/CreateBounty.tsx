import { useState, type SyntheticEvent } from "react";
import { CalendarDays, CircleHelp, Eye, Plus } from "lucide-react";
import {
  categories,
  dateLabel,
  sol,
  type BountyDraft,
} from "../types/bounty";
import "./CreateBounty.css";

interface CreateBountyProps {
  onCreate: (bounty: BountyDraft) => void;
  onCancel: () => void;
}

const suggestedTags = ["web3", "solana", "smart-contract", "ui/ux"];

const initialForm = {
  title: "",
  description: "",
  reward: "",
  deadline: "",
  category: "",
  tags: [] as string[],
};

// Use the local date rather than UTC, so the minimum date is correct locally.
function todayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CreateBounty({
  onCreate,
  onCancel,
}: CreateBountyProps) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  // Update one field in the form.
  function updateField(
    field: "title" | "description" | "reward" | "deadline" | "category",
    value: string
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError("");
  }

  // Select or deselect a suggested tag.
  function toggleTag(tag: string) {
    setForm((previous) => ({
      ...previous,
      tags: previous.tags.includes(tag)
        ? previous.tags.filter((item) => item !== tag)
        : [...previous.tags, tag],
    }));
  }

  // Validate the bounty, then send it to the parent App.
  function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();

    const reward = Number(form.reward);

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.deadline ||
      !form.reward.trim() ||
      !Number.isFinite(reward) ||
      reward <= 0
    ) {
      setError("Complete the title, description, positive reward, and deadline.");
      return;
    }

    if (form.deadline < todayLocal()) {
      setError("Choose a deadline that has not passed.");
      return;
    }

    setError("");
    onCreate({
      title: form.title.trim(),
      description: form.description.trim(),
      reward,
      deadline: form.deadline,
      category: form.category || "Other",
      tags: form.tags,
    });
  }

  return (
    <main className="create-page">
      {/* Page heading */}
      <header className="create-heading">
        <h1>Create Bounty</h1>
        <p>Post an opportunity for the Solana community to complete.</p>
      </header>

      <div className="create-layout">
        {/* Bounty creation form */}
        <form className="create-form" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="create-field">
            <label htmlFor="bounty-title">Title *</label>
            <input
              id="bounty-title"
              name="title"
              type="text"
              maxLength={110}
              required
              placeholder="e.g., Build a Solana staking dashboard"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
            <small>A short, clear title for your bounty.</small>
          </div>

          {/* Description */}
          <div className="create-field">
            <label htmlFor="bounty-description">Description Reference *</label>
            <textarea
              id="bounty-description"
              name="description"
              rows={6}
              required
              placeholder="Describe the task, requirements, and useful references..."
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
            <small>Include scope, deliverables, and acceptance criteria.</small>
          </div>

          {/* Reward and deadline */}
          <div className="create-field-row">
            <div className="create-field">
              <label htmlFor="bounty-reward">Reward Amount (SOL) *</label>
              <input
                id="bounty-reward"
                name="reward"
                type="number"
                min="0.0001"
                step="any"
                required
                placeholder="e.g., 5.0"
                value={form.reward}
                onChange={(event) => updateField("reward", event.target.value)}
              />
              <small>Amount paid to the contributor.</small>
            </div>

            <div className="create-field">
              <label htmlFor="bounty-deadline">Deadline *</label>
              <input
                id="bounty-deadline"
                name="deadline"
                type="date"
                min={todayLocal()}
                required
                value={form.deadline}
                onChange={(event) =>
                  updateField("deadline", event.target.value)
                }
              />
              <small>When the task must be completed.</small>
            </div>
          </div>

          {/* Category */}
          <div className="create-field">
            <label htmlFor="bounty-category">Category (optional)</label>
            <select
              id="bounty-category"
              name="category"
              value={form.category}
              onChange={(event) =>
                updateField("category", event.target.value)
              }
            >
              <option value="">Select a category</option>
              {categories.slice(1).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Suggested tags */}
          <fieldset className="create-tags-fieldset">
            <legend>Tags (optional)</legend>
            <div className="create-tag-list">
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`create-tag ${
                    form.tags.includes(tag) ? "selected" : ""
                  }`}
                  aria-pressed={form.tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                >
                  {form.tags.includes(tag) ? "✓" : "+"} {tag}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Form error message */}
          {error && (
            <p className="create-form-error" role="alert">
              {error}
            </p>
          )}

          {/* Submit and cancel actions */}
          <div className="create-actions">
            <button type="submit" className="create-submit-button">
              <Plus size={17} />
              Create Bounty
            </button>
            <button
              type="button"
              className="create-cancel-button"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Live bounty preview and posting tips */}
        <aside className="create-sidebar">
          <section className="create-preview-panel">
            <div className="create-panel-heading">
              <h2>
                <Eye size={18} />
                Preview
              </h2>
              <p>How your bounty will appear on the board.</p>
            </div>

            <article className="create-preview-card">
              <div className="create-preview-title">
                <h3>{form.title || "Your Bounty Title"}</h3>
                <span className="create-status">Open</span>
              </div>

              <p className="create-preview-description">
                {form.description || "Your bounty description will appear here..."}
              </p>

              {form.tags.length > 0 && (
                <div className="create-tag-list">
                  {form.tags.map((tag) => (
                    <span className="create-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="create-preview-footer">
                <strong>
                  {Number(form.reward) > 0
                    ? sol(Number(form.reward))
                    : "0 SOL"}
                </strong>
                <span>
                  <CalendarDays size={15} />
                  {form.deadline ? dateLabel(form.deadline) : "Select deadline"}
                </span>
              </div>
            </article>
          </section>

          <section className="create-tips-panel">
            <h2>
              <CircleHelp size={18} />
              Posting Tips
            </h2>
            <ul>
              <li>Write a clear and specific description.</li>
              <li>Include useful references like GitHub or documentation.</li>
              <li>Set a realistic reward and deadline.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
