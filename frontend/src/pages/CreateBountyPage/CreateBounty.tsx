
import { useState, type FormEvent } from "react";
import {
  CalendarDays,
  Coins,
  Eye,
  Lightbulb,
  Plus,
  X,
} from "lucide-react";

import type { BountyDraft } from "../../types/bounty";
import { categories } from "../../types/bounty";

import "./CreateBounty.css";

interface CreateBountyProps {
  onCreate: (bounty: BountyDraft) => void;
  onCancel: () => void;
}

const MAX_TITLE_BYTES = 64;
const MAX_DESCRIPTION_BYTES = 200;
const MAX_U64 = (1n << 64n) - 1n;

const availableTags = [
  "React",
  "Solana",
  "TypeScript",
  "JavaScript",
  "Rust",
  "Anchor",
  "Frontend",
  "Backend",
  "UI/UX",
  "Design",
  "Web3",
  "Smart Contracts",
  "Writing",
  "Research",
  "Marketing",
];

function getLocalToday(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseReward(value: string): bigint | null {
  const trimmed = value.trim();

  if (!/^\d+(\.\d{1,9})?$/.test(trimmed)) {
    return null;
  }

  const [whole, fraction = ""] = trimmed.split(".");

  try {
    const lamports =
      BigInt(whole) * 1_000_000_000n +
      BigInt(fraction.padEnd(9, "0"));

    if (lamports <= 0n || lamports > MAX_U64) {
      return null;
    }

    return lamports;
  } catch {
    return null;
  }
}

export default function CreateBounty({
  onCreate,
  onCancel,
}: CreateBountyProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Development");

  const [selectedTags, setSelectedTags] = useState<string[]>(
    []
  );

  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState("");

  const encoder = new TextEncoder();

  const titleBytes = encoder.encode(title.trim()).length;
  const descriptionBytes = encoder.encode(
    description.trim()
  ).length;

  const today = getLocalToday();

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  }

  function addCustomTag() {
    const tag = customTag.trim();

    if (!tag) return;

    if (
      !selectedTags.some(
        (item) => item.toLowerCase() === tag.toLowerCase()
      )
    ) {
      setSelectedTags((current) => [...current, tag]);
    }

    setCustomTag("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (
      titleBytes < 1 ||
      titleBytes > MAX_TITLE_BYTES
    ) {
      setError(
        "Title must contain between 1 and 64 bytes."
      );
      return;
    }

    if (
      descriptionBytes < 1 ||
      descriptionBytes > MAX_DESCRIPTION_BYTES
    ) {
      setError(
        "Description must contain between 1 and 200 bytes."
      );
      return;
    }

    const rewardLamports = parseReward(reward);

    if (rewardLamports === null) {
      setError(
        "Enter a positive SOL reward with up to 9 decimal places."
      );
      return;
    }

    const rewardAmount = Number(reward);

    if (!Number.isFinite(rewardAmount)) {
      setError("Invalid reward amount.");
      return;
    }

    if (!deadline) {
      setError("Please select a deadline.");
      return;
    }

    const deadlineTimestamp = new Date(
      `${deadline}T23:59:00`
    ).getTime();

    if (
      !Number.isFinite(deadlineTimestamp) ||
      deadlineTimestamp <= Date.now()
    ) {
      setError(
        "Please choose a future deadline."
      );
      return;
    }

    const bounty: BountyDraft = {
      title: cleanTitle,
      description: cleanDescription,
      reward: rewardAmount,
      deadline,
      category,
      tags: selectedTags,
    };

    onCreate(bounty);
  }

  const displayDeadline = deadline
    ? new Date(
        `${deadline}T12:00:00`
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No deadline set";

  const displayReward = reward
    ? Number(reward).toLocaleString("en-US", {
        maximumFractionDigits: 9,
      })
    : "0";

  const allTags = [
    ...availableTags,
    ...selectedTags.filter(
      (tag) => !availableTags.includes(tag)
    ),
  ];

  return (
    <main className="create-page">
      {/* PAGE HEADING */}
      <div className="create-heading">
        <h1>Create Bounty</h1>
        <p>
          Post an opportunity for the Solana community
          to complete.
        </p>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="create-layout">
        {/* LEFT COLUMN — FORM */}
        <form
          className="create-form"
          onSubmit={handleSubmit}
        >
          {/* TITLE */}
          <div className="create-field">
            <label htmlFor="create-title">
              Title *
            </label>

            <input
              id="create-title"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Build a Solana landing page"
              required
            />

            <small>
              {titleBytes}/{MAX_TITLE_BYTES} bytes
            </small>
          </div>

          {/* DESCRIPTION */}
          <div className="create-field">
            <label htmlFor="create-description">
              Description *
            </label>

            <textarea
              id="create-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Describe the project, deliverables, and expectations..."
              rows={6}
              required
            />

            <small>
              {descriptionBytes}/{MAX_DESCRIPTION_BYTES} bytes
            </small>
          </div>

          {/* REWARD + DEADLINE */}
          <div className="create-field-row">
            <div className="create-field">
              <label htmlFor="create-reward">
                Reward (SOL) *
              </label>

              <input
                id="create-reward"
                type="number"
                min="0.000000001"
                step="any"
                value={reward}
                onChange={(event) =>
                  setReward(event.target.value)
                }
                placeholder="e.g. 1.0"
                required
              />

              <small>
                Reward is deposited into escrow.
              </small>
            </div>

            <div className="create-field">
              <label htmlFor="create-deadline">
                Deadline *
              </label>

              <input
                id="create-deadline"
                type="date"
                value={deadline}
                min={today}
                onChange={(event) =>
                  setDeadline(event.target.value)
                }
                required
              />

              <small>
                When should the work be completed?
              </small>
            </div>
          </div>

          {/* CATEGORY */}
          <div className="create-field">
            <label htmlFor="create-category">
              Category
            </label>

            <select
              id="create-category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
            >
              {categories
                .filter((item) => item !== "All")
                .map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
            </select>
          </div>

          {/* ORIGINAL SELECTABLE TAGS */}
          <fieldset className="create-tags-fieldset">
            <legend>Tags</legend>

            <div className="create-tag-list">
              {allTags.map((tag) => {
                const selected =
                  selectedTags.includes(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    className={
                      selected
                        ? "create-tag selected"
                        : "create-tag"
                    }
                    onClick={() => toggleTag(tag)}
                  >
                    {selected ? "✓ " : "+ "}
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* CUSTOM TAG */}
          <div className="create-field">
            <label htmlFor="create-custom-tag">
              Add Custom Tag
            </label>

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <input
                id="create-custom-tag"
                type="text"
                value={customTag}
                onChange={(event) =>
                  setCustomTag(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="e.g. Python"
              />

              <button
                type="button"
                className="create-cancel-button"
                onClick={addCustomTag}
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>

          {/* SELECTED TAGS */}
          {selectedTags.length > 0 && (
            <div className="create-field">
              <label>Selected Tags</label>

              <div className="create-tag-list">
                {selectedTags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    className="create-tag selected"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    <X size={12} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div
              className="create-form-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="create-actions">
            <button
              type="button"
              className="create-cancel-button"
              onClick={onCancel}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create-submit-button"
            >
              <Plus size={17} />
              Create Bounty
            </button>
          </div>
        </form>

        {/* RIGHT COLUMN */}
        <aside className="create-sidebar">
          {/* LIVE PREVIEW */}
          <div className="create-preview-panel">
            <div className="create-panel-heading">
              <h2>
                <Eye size={19} />
                Preview
              </h2>

              <p>
                How your bounty will appear on
                the board.
              </p>
            </div>

            <div className="create-preview-card">
              <div className="create-preview-title">
                <h3>
                  {title.trim() || "Your bounty title"}
                </h3>

                <span className="create-status">
                  Open
                </span>
              </div>

              <p className="create-preview-description">
                {description.trim() ||
                  "Your bounty description will appear here."}
              </p>

              {selectedTags.length > 0 && (
                <div className="create-tag-list">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="create-tag"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="create-preview-footer">
                <div>
                  <span>
                    <Coins size={15} />
                    Reward
                  </span>

                  <div>
                    <strong>
                      {displayReward} SOL
                    </strong>
                  </div>
                </div>

                <div>
                  <span>
                    <CalendarDays size={15} />
                    Deadline
                  </span>

                  <div>
                    <span>
                      {displayDeadline}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TIPS PANEL */}
          <div className="create-tips-panel">
            <h2>
              <Lightbulb size={19} />
              Tips for a Great Bounty
            </h2>

            <ul>
              <li>
                Write a clear and descriptive title.
              </li>

              <li>
                Explain exactly what needs to be
                delivered.
              </li>

              <li>
                Set a fair reward for the amount
                of work required.
              </li>

              <li>
                Choose a realistic deadline.
              </li>

              <li>
                Add relevant tags to help
                describe the project.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
