
import { useEffect, useState } from "react";

import Layout from "./components/Layout";
import BrowsePage from "./pages/BrowsePage/BrowsePage";
import BookmarksPage from "./pages/BookmarksPage/BookmarksPage.tsx";
import MyBountiesPage from "./pages/MyBountiesPage/MyBountiesPage";

type Page = "browse" | "bookmarks" | "my-bounties" | "settings";

// Load previously saved bookmarks
function loadBookmarks(): Set<string> {
  try {
    const saved = localStorage.getItem("bountyboard-bookmarks");

    if (saved) {
      const ids: unknown = JSON.parse(saved);

      if (
        Array.isArray(ids) &&
        ids.every((id) => typeof id === "string")
      ) {
        return new Set(ids);
      }
    }
  } catch {
    // Fall back to empty bookmarks
  }

  return new Set();
}

function App() {
  const [activePage, setActivePage] = useState<Page>("browse");

  const [bookmarks, setBookmarks] = useState<Set<string>>(
    loadBookmarks
  );

  // Save bookmarks when they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "bountyboard-bookmarks",
        JSON.stringify([...bookmarks])
      );
    } catch {
      // Ignore storage errors
    }
  }, [bookmarks]);

  // Add or remove a bookmark
  function toggleBookmark(id: string) {
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

  function renderPage() {
    switch (activePage) {
      case "browse":
        return (
          <BrowsePage
            bookmarks={bookmarks}
            onBookmark={toggleBookmark}
          />
        );

      case "bookmarks":
        return (
          <BookmarksPage
            bookmarks={bookmarks}
            onBookmark={toggleBookmark}
          />
        );

      case "settings":
        return (
          <main className="browse-page">
            <h1 style={{ color: "#1f2937" }}>
              Settings
            </h1>
            <p>Settings will be available soon.</p>
          </main>
        );
      
      case "my-bounties":
        return(
          <MyBountiesPage />
        );
    }
  }

  return (
    <Layout
      activePage={activePage}
      onNavigate={(page) => setActivePage(page as Page)}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;
