
import BountyDescPage from "../BountyDescPage/BountyDescPage";
import { useState } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tags,
  RotateCcw,
} from "lucide-react";

import BountyCard from "./BountyCard";
import { mockBounties } from "../../data/mockBounties";
import type { Bounty, BountyStatus } from "../../types/bounty";
import "./BrowsePage.css";

type StatusFilter = "All" | BountyStatus;

type SortOption =
  | "newest"
  | "reward-high"
  | "reward-low"
  | "deadline";

interface BrowsePageProps {
  bookmarks: Set<string>;
  onBookmark: (id: string) => void;
  bookmarksOnly?: boolean;
}

const PAGE_SIZE = 4;

export default function BrowsePage({
  bookmarks,
  onBookmark,
  bookmarksOnly = false,
}: BrowsePageProps) {
  const defaultStatus: StatusFilter = bookmarksOnly ? "All" : "Open";

  // Search, status, sorting and tag filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(defaultStatus);
  const [sortBy, setSortBy] =
    useState<SortOption>("newest");

  const [selectedTags, setSelectedTags] =
    useState<string[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Selected bounty opens the existing details page
  const [selectedBounty, setSelectedBounty] =
    useState<Bounty | null>(null);

  // Generate a unique list of available tags
  const availableTags = [
    ...new Set(mockBounties.flatMap((bounty) => bounty.tags)),
  ].sort();

  // Filter the tags displayed inside the dropdown
  const visibleTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  // Select or deselect a tag
  function toggleTag(tag: string) {
    setSelectedTags((previous) =>
      previous.includes(tag)
        ? previous.filter((item) => item !== tag)
        : [...previous, tag]
    );

    setCurrentPage(1);
  }

  // Return to default filters
  function clearFilters() {
    setSearch("");
    setStatusFilter(defaultStatus);
    setSortBy("newest");
    setSelectedTags([]);
    setTagSearch("");
    setTagsOpen(false);
    setCurrentPage(1);
  }

  // Filter by bookmarks, search, status, tags, and deadline
  const filteredBounties = mockBounties
    .filter((bounty) => {
      if (bookmarksOnly && !bookmarks.has(bounty.id)) {
        return false;
      }

      const query = search.trim().toLowerCase();

      const matchesSearch =
        bounty.title.toLowerCase().includes(query) ||
        bounty.descriptionRef.toLowerCase().includes(query) ||
        bounty.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "All" ||
        bounty.status === statusFilter;

      // OR filtering: match any selected tag
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) =>
          bounty.tags.includes(tag)
        );

      // Open bounties past their deadline are unavailable
      const isExpired =
        bounty.deadline <= Math.floor(Date.now() / 1000);

      const matchesDeadline =
        statusFilter !== "Open" || !isExpired;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesTags &&
        matchesDeadline
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "reward-high":
          return a.rewardLamports === b.rewardLamports
            ? 0
            : a.rewardLamports > b.rewardLamports
              ? -1
              : 1;

        case "reward-low":
          return a.rewardLamports === b.rewardLamports
            ? 0
            : a.rewardLamports < b.rewardLamports
              ? -1
              : 1;

        case "deadline":
          return a.deadline - b.deadline;

        case "newest":
        default:
          // Mock IDs temporarily represent creation order
          return Number(b.id) - Number(a.id);
      }
    });

  // Total saved bounties (regardless of active filters)
  const savedCount = mockBounties.filter((bounty) =>
    bookmarks.has(bounty.id)
  ).length;

  // Calculate pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBounties.length / PAGE_SIZE)
  );

  // Prevent empty pages when bookmarks are removed
  const safePage = Math.min(currentPage, totalPages);

  const visibleBounties = filteredBounties.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Preserve the existing dedicated bounty details page
  if (selectedBounty) {
    return (
      <BountyDescPage
        key={selectedBounty.id}
        bounty={selectedBounty}
        isBookmarked={bookmarks.has(selectedBounty.id)}
        onBookmark={onBookmark}
        onBack={() => setSelectedBounty(null)}
      />
    );
  }

  return (
    <main className="browse-page">
      {/* Page heading */}
      <header className="browse-heading">
        <h1>
          {bookmarksOnly
            ? "My Bookmarks"
            : "Browse Bounties"}
        </h1>

        <p>
          {bookmarksOnly
            ? "Bounties you've saved for later."
            : "Discover opportunities on Solana."}
        </p>
      </header>

      {/* Empty bookmarks state */}
      {bookmarksOnly && savedCount === 0 ? (
        <div className="empty-state">
          <h2>No bookmarked bounties yet</h2>
          <p>
            Save bounties using the bookmark icon on
            the Browse page.
          </p>
        </div>
      ) : (
        <>
          {/* Search and filter controls */}
          <section className="browse-controls">
            <label className="search-container">
              <Search size={20} />

              <input
                type="search"
                aria-label="Search bounties"
                placeholder={
                  bookmarksOnly
                    ? "Search saved bounties..."
                    : "Search by title, description, or tag..."
                }
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>

            <div className="filter-row">
              {/* Status dropdown */}
              <label className="filter-group">
                <span>Status</span>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(
                      event.target.value as StatusFilter
                    );
                    setCurrentPage(1);
                  }}
                >
                  <option value="Open">
                    Available Jobs
                  </option>
                  <option value="All">
                    All Statuses
                  </option>
                  <option value="Accepted">
                    Accepted
                  </option>
                  <option value="Submitted">
                    Submitted
                  </option>
                  <option value="Completed">
                    Completed
                  </option>
                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </label>

              {/* Sorting dropdown */}
              <label className="filter-group">
                <span>Sort By</span>

                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(
                      event.target.value as SortOption
                    );
                    setCurrentPage(1);
                  }}
                >
                  <option value="newest">
                    Newest Added
                  </option>
                  <option value="reward-high">
                    Highest Reward
                  </option>
                  <option value="reward-low">
                    Lowest Reward
                  </option>
                  <option value="deadline">
                    Deadline Soonest
                  </option>
                </select>
              </label>

              {/* Tag dropdown */}
              <div className="tag-dropdown-container">
                <span className="tag-dropdown-label">
                  Tags
                </span>

                <button
                  type="button"
                  className="tag-dropdown-trigger"
                  aria-expanded={tagsOpen}
                  aria-controls="tag-dropdown-options"
                  onClick={() => setTagsOpen(!tagsOpen)}
                >
                  <Tags size={17} />

                  <span>
                    {selectedTags.length > 0
                      ? `${selectedTags.length} tags selected`
                      : "All Tags"}
                  </span>

                  <ChevronDown
                    size={17}
                    className={
                      tagsOpen ? "chevron-open" : ""
                    }
                  />
                </button>

                {tagsOpen && (
                  <div
                    id="tag-dropdown-options"
                    className="tag-dropdown-menu"
                  >
                    {/* Search inside dropdown */}
                    <div className="tag-search-container">
                      <Search size={16} />

                      <input
                        type="search"
                        aria-label="Search tags"
                        placeholder="Search tags..."
                        value={tagSearch}
                        onChange={(event) =>
                          setTagSearch(event.target.value)
                        }
                      />
                    </div>

                    {/* Tag checkbox list */}
                    <div className="tag-dropdown-options">
                      {visibleTags.length > 0 ? (
                        visibleTags.map((tag) => (
                          <label
                            key={tag}
                            className="tag-dropdown-option"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTags.includes(tag)}
                              onChange={() => toggleTag(tag)}
                            />

                            <span>{tag}</span>
                          </label>
                        ))
                      ) : (
                        <p className="no-tags-found">
                          No matching tags.
                        </p>
                      )}
                    </div>

                    {/* Dropdown footer */}
                    <div className="tag-dropdown-footer">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTags([]);
                          setCurrentPage(1);
                        }}
                      >
                        Clear All
                      </button>

                      <button
                        type="button"
                        className="tag-done-button"
                        onClick={() => setTagsOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selected tag chips */}
            {selectedTags.length > 0 && (
              <div className="selected-tag-list">
                <span className="selected-tags-label">
                  Active tags:
                </span>

                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="selected-tag-chip"
                    onClick={() => toggleTag(tag)}
                    aria-label={`Remove ${tag} filter`}
                  >
                    {tag}
                    <X size={13} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Results count */}
          <div className="results-header">
            <span>
              {filteredBounties.length}{" "}
              {filteredBounties.length === 1
                ? "bounty"
                : "bounties"}{" "}
              found
            </span>

            <button
              type="button"
              className="reset-filters-button"
              onClick={clearFilters}
            >
              <RotateCcw size={15} />
              Reset Filters
            </button>
          </div>

          {/* Bounty cards */}
          {visibleBounties.length > 0 ? (
            <section
              className="bounty-grid"
              aria-label="Bounty listings"
            >
              {visibleBounties.map((bounty) => (
                <BountyCard
                  key={bounty.id}
                  bounty={bounty}
                  isBookmarked={bookmarks.has(bounty.id)}
                  onBookmark={onBookmark}
                  onViewDetails={setSelectedBounty}
                  onTagClick={(tag) => {
                    if (!selectedTags.includes(tag)) {
                      toggleTag(tag);
                    }
                  }}
                />
              ))}
            </section>
          ) : (
            <div className="empty-state">
              <Search size={36} />
              <h2>No matching bounties</h2>
              <p>Try changing your search or filters.</p>

              <button type="button" onClick={clearFilters}>
                Reset Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="pagination"
              aria-label="Bounty pages"
            >
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() =>
                  setCurrentPage(safePage - 1)
                }
              >
                <ChevronLeft size={17} />
                Previous
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={
                    safePage === pageNumber
                      ? "active-page"
                      : ""
                  }
                  aria-current={
                    safePage === pageNumber
                      ? "page"
                      : undefined
                  }
                  onClick={() =>
                    setCurrentPage(pageNumber)
                  }
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() =>
                  setCurrentPage(safePage + 1)
                }
              >
                Next
                <ChevronRight size={17} />
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
