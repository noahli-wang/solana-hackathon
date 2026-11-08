
import { useEffect, useState } from "react";

import Layout from "./components/Layout";
import BrowsePage from "./pages/BrowsePage/BrowsePage";
<<<<<<< HEAD
import BookmarksPage from "./pages/BookmarksPage/BookmarksPage.tsx";
import MyBountiesPage from "./pages/MyBountiesPage/MyBountiesPage";
=======
import BookmarksPage from "./pages/BookmarksPage/BookmarksPage";
import BountyConnectionTest from "./components/BountyConnectionTest";
>>>>>>> 2c6727aa2288056a9a7121492c1e0d2f07394eef

type Page = "browse" | "bookmarks" | "my-bounties" | "settings";

const BOOKMARKS_STORAGE_KEY = "bountyboard-bookmarks";

function App() {
  // Track the currently selected sidebar page.
  const [activePage, setActivePage] = useState<Page>("browse");

  // Load saved bookmarks from localStorage.
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

  // Save bookmarks whenever they change.
  useEffect(() => {
    localStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify([...bookmarks])
    );
  }, [bookmarks]);

  // Add or remove a bookmarked bounty.
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

  // Handle navigation from the sidebar.
  function handleNavigate(page: string) {
    if (
      page === "browse" ||
      page === "bookmarks" ||
      page === "my-bounties" ||
      page === "settings"
    ) {
      setActivePage(page);
    }
  }

  // Render the selected page.
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

<<<<<<< HEAD
=======
      case "my-bounties":
        return (
          <div style={{ padding: "32px" }}>
            <h1>My Bounties</h1>
            <p>
              Your created and accepted bounties will appear here.
            </p>
          </div>
        );

>>>>>>> 2c6727aa2288056a9a7121492c1e0d2f07394eef
      case "settings":
        return (
          <div style={{ padding: "32px" }}>
            <h1>Settings</h1>
            <p>Account settings will appear here.</p>
          </div>
        );
<<<<<<< HEAD
      
      case "my-bounties":
        return(
          <MyBountiesPage />
        );
=======

      default:
        return null;
>>>>>>> 2c6727aa2288056a9a7121492c1e0d2f07394eef
    }
  }

  return (
    <Layout
      activePage={activePage}
      onNavigate={handleNavigate}
    >
      {/* Temporary Devnet connection test */}
      <BountyConnectionTest />

      {/* Existing application pages */}
      {renderPage()}
    </Layout>
  );
}

export default App;
