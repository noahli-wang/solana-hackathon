
import { useMemo, useState } from "react";

import BountyCard from "../BrowsePage/BountyCard";
import type { Bounty } from "../../types/bounty";

import "./JobsBoard.css";

interface JobsBoardProps {
  title: string;
  subtitle: string;
  items: Bounty[];
  bookmarks: string[];
  query: string;
  onBookmark: (id: string) => void;
  onOpen: (bounty: Bounty) => void;
  onCreate: () => void;
}

type SortOption = "newest" | "reward" | "deadline";

const PAGE_SIZE = 5;

export default function JobsBoard({
  title,
  subtitle,
  items,
  bookmarks,
  query,
  onBookmark,
  onOpen,
  onCreate,
}: JobsBoardProps) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  // Extract available tags from the bounty list.
  // Category is not currently part of the on-chain account.
  const availableTags = useMemo(
    () => [
      "All Tags",
      ...new Set(items.flatMap((bounty) => bounty.tags)),
    ],
    [items]
  );

  const [selectedTag, setSelectedTag] = useState("All Tags");

  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();

    return items
      .filter((bounty) => {
        const matchesTag =
          selectedTag === "All Tags" ||
          bounty.tags.includes(selectedTag);

        const matchesSearch =
          !search ||
          [
            bounty.title,
            bounty.descriptionRef,
            bounty.creator,
            ...bounty.tags,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search);

        return matchesTag && matchesSearch;
      })
      .sort((a, b) => {
        if (sort === "reward") {
          if (a.rewardLamports === b.rewardLamports) {
            return 0;
          }

          return a.rewardLamports > b.rewardLamports
            ? -1
            : 1;
        }

        if (sort === "deadline") {
          return a.deadline - b.deadline;
        }

        // Solana public keys don't represent creation order.
        // Use a deterministic order for now.
        return b.id.localeCompare(a.id);
      });
  }, [items, selectedTag, query, sort]);

  const maxPage = Math.max(
    1,
    Math.ceil(matches.length / PAGE_SIZE)
  );

  const activePage = Math.min(page, maxPage);

  const paged = matches.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            EXPLORE OPPORTUNITIES
          </span>

          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onCreate}
        >
          ＋ Create Bounty
        </button>
      </div>

      <div className="board-toolbar">
        <strong>☷ Filter jobs</strong>

        <select
          aria-label="Filter by tag"
          value={selectedTag}
          onChange={(event) => {
            setSelectedTag(event.target.value);
            setPage(1);
          }}
        >
          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort jobs"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as SortOption);
            setPage(1);
          }}
        >
          <option value="newest">
            Newest first
          </option>

          <option value="reward">
            Highest reward
          </option>

          <option value="deadline">
            Deadline soonest
          </option>
        </select>

        <span className="result-count">
          {matches.length} bounties
        </span>
      </div>

      <section
        className="board-list"
        aria-label="Job listings"
      >
        {paged.length > 0 ? (
          paged.map((bounty) => (
            <BountyCard
              key={bounty.id}
              bounty={bounty}
              isBookmarked={bookmarks.includes(bounty.id)}
              onBookmark={onBookmark}
              onViewDetails={onOpen}
              onTagClick={() => {}}
            />
          ))
        ) : (
          <div className="empty-state">
            <h2>No bounties found</h2>
            <p>
              Try a different search or tag.
            </p>
          </div>
        )}
      </section>

      {maxPage > 1 && (
        <div className="pagination">
          <span>
            Showing {(activePage - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(
              activePage * PAGE_SIZE,
              matches.length
            )}{" "}
            of {matches.length}
          </span>

          <div>
            <button
              type="button"
              disabled={activePage === 1}
              onClick={() =>
                setPage((current) => current - 1)
              }
            >
              ←
            </button>

            {Array.from(
              { length: maxPage },
              (_, index) => index + 1
            ).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={
                  activePage === pageNumber
                    ? "current"
                    : ""
                }
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              disabled={activePage === maxPage}
              onClick={() =>
                setPage((current) => current + 1)
              }
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
