import { useEffect, useState } from "react";
import {
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";

import Layout from "./components/Layout";
import BrowsePage from "./pages/BrowsePage/BrowsePage";
import BookmarksPage from "./pages/BookmarksPage/BookmarksPage";
import MyBountiesPage from "./pages/MyBountiesPage/MyBountiesPage";
import CreateBounty from "./pages/CreateBountyPage/CreateBounty.tsx";

import { createBounty } from "./services/createBountyService";
import type { BountyDraft } from "./types/bounty";

type Page =
  | "browse"
  | "bookmarks"
  | "my-bounties"
  | "create-bounty"
  | "settings";

const BOOKMARKS_STORAGE_KEY = "bountyboard-bookmarks";

function App() {
  const [activePage, setActivePage] = useState<Page>("browse");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);

      if (!saved) {
        return new Set<string>();
      }

      const parsed: unknown = JSON.parse(saved);

      if (
        Array.isArray(parsed) &&
        parsed.every((id) => typeof id === "string")
      ) {
        return new Set<string>(parsed);
      }
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
    }

    return new Set<string>();
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        BOOKMARKS_STORAGE_KEY,
        JSON.stringify([...bookmarks])
      );
    } catch (error) {
      console.error("Failed to save bookmarks:", error);
    }
  }, [bookmarks]);

  function handleBookmark(id: string) {
    setBookmarks((previous) => {
      const updated = new Set(previous);

      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }

      return updated;
    });
  }

  function handleNavigate(page: string) {
    if (
      page === "browse" ||
      page === "bookmarks" ||
      page === "my-bounties" ||
      page === "settings"
    ) {
      setCreateError(null);
      setActivePage(page);
    }
  }

  async function handleCreateBounty(draft: BountyDraft) {
    if (creating) return;

    if (!wallet) {
      setCreateError("Please connect Phantom first.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      // The existing form uses a date-only value.
      // Interpret its deadline as 11:59 PM local time.
      const deadline = new Date(
        `${draft.deadline}T23:59:00`
      );

      if (Number.isNaN(deadline.getTime())) {
        throw new Error("Invalid bounty deadline.");
      }

      const result = await createBounty(connection, wallet, {
        title: draft.title,
        description: draft.description,
        rewardSol: String(draft.reward),
        deadline: Math.floor(deadline.getTime() / 1000),
      });

      console.log("Bounty created:", result);

      setActivePage("my-bounties");
    } catch (error) {
      console.error("Failed to create bounty:", error);

      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create bounty."
      );
    } finally {
      setCreating(false);
    }
  }

  function renderPage() {
    switch (activePage) {
      case "browse":
        return (
          <BrowsePage
            bookmarks={bookmarks}
            onBookmark={handleBookmark}
          />
        );

      case "bookmarks":
        return (
          <BookmarksPage
            bookmarks={bookmarks}
            onBookmark={handleBookmark}
          />
        );

      case "my-bounties":
        return (
          <MyBountiesPage
            onCreateBounty={() => {
              setCreateError(null);
              setActivePage("create-bounty");
            }}
          />
        );

      case "create-bounty":
        return (
          <>
            {createError && (
              <div
                role="alert"
                style={{
                  margin: "16px 24px",
                  padding: "14px",
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: "10px",
                  color: "#be123c",
                }}
              >
                {createError}
              </div>
            )}

            {creating && (
              <p
                role="status"
                style={{
                  padding: "12px 24px",
                  color: "#7654d6",
                }}
              >
                Creating bounty. Check Phantom for the
                transaction request...
              </p>
            )}

            <CreateBounty
              onCreate={(draft) => {
                void handleCreateBounty(draft);
              }}
              onCancel={() => {
                if (creating) return;

                setCreateError(null);
                setActivePage("my-bounties");
              }}
            />
          </>
        );

      case "settings":
        return (
          <div style={{ padding: "32px" }}>
            <h1>Settings</h1>
            <p>Account settings will appear here.</p>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <Layout
      activePage={
        activePage === "create-bounty"
          ? "my-bounties"
          : activePage
      }
      onNavigate={handleNavigate}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;
