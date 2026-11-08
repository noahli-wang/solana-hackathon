import { useState } from "react";
import type { FormEvent } from "react";
import { MessageSquare } from "lucide-react";

interface ProgressNote {
  id: number;
  text: string;
  postedAt: Date;
}

// "Progress Notes" section of the right-hand panel
export default function ProgressNotes() {
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [draft, setDraft] = useState("");

  function postNote(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setNotes((previous) => [
      ...previous,
      { id: Date.now(), text, postedAt: new Date() },
    ]);
    setDraft("");
  }

  return (
    <div className="progress-section">
      <h3 className="panel-heading">
        <MessageSquare size={18} />
        Progress Notes
      </h3>

      {notes.length === 0 ? (
        <p className="progress-body">No updates yet.</p>
      ) : (
        <ul className="notes-list">
          {notes.map((note) => (
            <li key={note.id}>
              <p>{note.text}</p>
              <time dateTime={note.postedAt.toISOString()}>
                {note.postedAt.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}

      <form className="note-form" onSubmit={postNote}>
        <textarea
          placeholder="Add a note / update..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
        />
        <button type="submit" className="post-button" disabled={!draft.trim()}>
          Post
        </button>
      </form>
    </div>
  );
}
