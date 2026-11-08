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

const PAGE_SIZE = 4;

export default function BrowsePage() {
  // Search, status, sorting and tag filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("Open");
  const [sortBy, setSortBy] =
    useState<SortOption>("newest");

  const [selectedTags, setSelectedTags] =
    useState<string[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Bookmarks and temporary bounty details
  const [bookmarks, setBookmarks] =
    useState<Set<string>>(new Set());

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

  // Bookmark or unbookmark a bounty
  function toggleBookmark(id: string) {
    setBookmarks((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  // Return to default Browse page filters
  function clearFilters() {
    setSearch("");
    setStatusFilter("Open");
    setSortBy("newest");
    setSelectedTags([]);
    setTagSearch("");
    setTagsOpen(false);
    setCurrentPage(1);
  }

  // Apply search, status and selected tag filters
  const filteredBounties = mockBounties
    .filter((bounty) => {
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

      // Match any selected tag (OR filtering)
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) =>
          bounty.tags.includes(tag)
        );

      // Don't show expired Open bounties as available
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
          // Temporary mock data ordering
          return Number(b.id) - Number(a.id);
      }
    });

  // Calculate pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBounties.length / PAGE_SIZE)
  );

  const visibleBounties = filteredBounties.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  if (selectedBounty) {
    return (
      <BountyDescPage
        key={selectedBounty.id}
        bounty={selectedBounty}
        isBookmarked={bookmarks.has(selectedBounty.id)}
        onBookmark={toggleBookmark}
        onBack={() => setSelectedBounty(null)}
      />
    );
  }

  return (
    <main className="browse-page">
      {/* Page heading */}
      <header className="browse-heading">
        <h1>Browse Bounties</h1>
        <p>Discover opportunities on Solana.</p>
      </header>

      {/* Search and filter controls */}
      <section className="browse-controls">
        <label className="search-container">
          <Search size={20} />

          <input
            type="search"
            aria-label="Search bounties"
            placeholder="Search by title, description, or tag..."
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
              <option value="Open">Available Jobs</option>
              <option value="All">All Statuses</option>
              <option value="Accepted">Accepted</option>
              <option value="Submitted">Submitted</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          {/* Sorting dropdown */}
          <label className="filter-group">
            <span>Sort By</span>

            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as SortOption);
                setCurrentPage(1);
              }}
            >
              <option value="newest">Newest Added</option>
              <option value="reward-high">Highest Reward</option>
              <option value="reward-low">Lowest Reward</option>
              <option value="deadline">Deadline Soonest</option>
            </select>
          </label>

          {/* Tag multi-select dropdown */}
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
                className={tagsOpen ? "chevron-open" : ""}
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

                {/* Checkbox list */}
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

                {/* Dropdown actions */}
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

      {/* Results count and reset button */}
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
              onBookmark={toggleBookmark}
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

          <h2>No bounties found</h2>
          <p>Try changing your search or filters.</p>

          <button type="button" onClick={clearFilters}>
            Reset Filters
          </button>
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav
          className="pagination"
          aria-label="Bounty pages"
        >
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((page) => page - 1)
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
                currentPage === pageNumber
                  ? "active-page"
                  : ""
              }
              aria-current={
                currentPage === pageNumber
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
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) => page + 1)
            }
          >
            Next
            <ChevronRight size={17} />
          </button>
        </nav>
      )}
    </main>
  );
}
