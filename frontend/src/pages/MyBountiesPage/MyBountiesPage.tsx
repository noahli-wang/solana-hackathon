
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import {
  CalendarDays,
  Coins,
  BarChart3,
  Clock,
  Plus,
  RotateCcw,
} from "lucide-react";

import { useLiveBounties } from "../../hooks/useLiveBounties";
import type { Bounty } from "../../types/bounty";

import "./MyBountiesPage.css";

// The three tabs on this page.
type Tab = "created" | "accepted" | "submitted";

// Convert lamports into SOL.
function formatSol(lamports: bigint): string {
  return `${Number(lamports) / 1_000_000_000} SOL`;
}

// Convert Unix seconds into a readable date.
function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString();
}

// Props passed from App.tsx.
interface MyBountiesPageProps {
  onCreateBounty?: () => void;
}

export default function MyBountiesPage({
  onCreateBounty,
}: MyBountiesPageProps) {
  // Current tab.
  const [activeTab, setActiveTab] = useState<Tab>("created");

  // Get the connected Phantom wallet.
  const { publicKey, connected } = useWallet();

  // Get real bounty accounts from Solana Devnet.
  const {
    bounties,
    loading,
    error,
    refresh,
  } = useLiveBounties();

  // Convert the connected wallet's public key to a string.
  const walletAddress = publicKey?.toBase58() ?? null;

  // Bounties created by the connected wallet.
  const created = walletAddress
    ? bounties.filter(
        (bounty) => bounty.creator === walletAddress
      )
    : [];

  // Bounties assigned to the connected wallet.
  const accepted = walletAddress
    ? bounties.filter(
        (bounty) => bounty.worker === walletAddress
      )
    : [];

  // Bounties where the connected worker has submitted work.
  const submitted = accepted.filter(
    (bounty) =>
      bounty.status === "Submitted" ||
      bounty.status === "Completed"
  );

  // Completed bounties involving the connected wallet.
  const completedCount = walletAddress
    ? bounties.filter(
        (bounty) =>
          bounty.status === "Completed" &&
          (
            bounty.creator === walletAddress ||
            bounty.worker === walletAddress
          )
      ).length
    : 0;

  // Tab labels and their counts.
  const tabs: {
    id: Tab;
    label: string;
    count: number;
  }[] = [
    {
      id: "created",
      label: "Created",
      count: created.length,
    },
    {
      id: "accepted",
      label: "Accepted",
      count: accepted.length,
    },
    {
      id: "submitted",
      label: "Submitted",
      count: submitted.length,
    },
  ];

  // Bounties to display for the selected tab.
  const visibleBounties =
    activeTab === "created"
      ? created
      : activeTab === "accepted"
        ? accepted
        : submitted;

  // Real on-chain actions have not been connected yet.
  // These functions will be implemented after checking
  // the deployed approve/cancel instructions and escrow.
  function handleApprove(_bounty: Bounty) {
    // No transaction is sent yet.
  }

  function handleCancel(_bounty: Bounty) {
    // No transaction is sent yet.
  }

  return (
    <main className="my-bounties-page">
      {/* Page heading */}
      <div className="my-bounties-heading">
        <div>
          <h1>My Bounties</h1>
          <p>
            Manage the bounties you've created,
            accepted, or submitted.
          </p>
        </div>

        <button
          type="button"
          className="create-bounty-button"
          onClick={onCreateBounty}
          disabled={!onCreateBounty}
        >
          <Plus size={18} />
          Create Bounty
        </button>
      </div>

      {/* Wallet connection state */}
      {!connected || !walletAddress ? (
        <div className="empty-message">
          <h3>Connect your wallet</h3>
          <p>
            Connect Phantom using the Select Wallet
            button above to see your bounties.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet information */}
          <p
            style={{
              marginBottom: "20px",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Showing Devnet bounties for wallet:{" "}
            <strong>
              {walletAddress.slice(0, 6)}
              ...
              {walletAddress.slice(-6)}
            </strong>
          </p>

          {/* Loading */}
          {loading ? (
            <div className="empty-message">
              <p>Loading your bounties from Solana Devnet...</p>
            </div>
          ) : error ? (
            <div className="empty-message" role="alert">
              <h3>Unable to load bounties</h3>
              <p>{error}</p>

              <button type="button" onClick={refresh}>
                <RotateCcw size={16} />
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Tab selector */}
              <div className="tab-selector">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`tab-button ${
                      activeTab === tab.id ? "active" : ""
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <div className="my-bounties-layout">
                {/* Left: bounty cards */}
                <section className="my-bounty-list">
                  {visibleBounties.length === 0 && (
                    <p className="empty-message">
                      {activeTab === "created"
                        ? "You haven't created any bounties on Devnet yet."
                        : activeTab === "accepted"
                          ? "You haven't accepted any bounties on Devnet yet."
                          : "You haven't submitted any bounties on Devnet yet."}
                    </p>
                  )}

                  {visibleBounties.map((bounty) => (
                    <article
                      key={bounty.id}
                      className="my-bounty-card"
                    >
                      <div className="my-bounty-card-header">
                        <h3>{bounty.title}</h3>

                        <span
                          className={`mb-status mb-status-${bounty.status.toLowerCase()}`}
                        >
                          {bounty.status}
                        </span>
                      </div>

                      <p className="my-bounty-description">
                        {bounty.descriptionRef}
                      </p>

                      <div className="my-bounty-card-footer">
                        <div className="my-bounty-meta">
                          <span>
                            <Coins size={15} />
                            {formatSol(bounty.rewardLamports)}
                          </span>

                          <span>
                            <CalendarDays size={15} />
                            {formatDate(bounty.deadline)}
                          </span>
                        </div>

                        {/* Creator actions.
                            Disabled until real Anchor transactions
                            and escrow logic are verified. */}
                        {activeTab === "created" && (
                          <div className="my-bounty-actions">
                            {bounty.status === "Submitted" && (
                              <button
                                type="button"
                                className="action-button approve"
                                onClick={() => handleApprove(bounty)}
                                disabled
                                title="On-chain approval is not connected yet"
                              >
                                Approve
                              </button>
                            )}

                            {bounty.status === "Open" && (
                              <button
                                type="button"
                                className="action-button cancel"
                                onClick={() => handleCancel(bounty)}
                                disabled
                                title="On-chain cancellation is not connected yet"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </section>

                {/* Right: summary and activity */}
                <aside className="my-bounties-sidebar">
                  <div className="side-box">
                    <h2>
                      <BarChart3 size={18} />
                      Activity Summary
                    </h2>

                    <ul className="summary-list">
                      <li>
                        <span>Created Bounties</span>
                        <strong>{created.length}</strong>
                      </li>

                      <li>
                        <span>Accepted Bounties</span>
                        <strong>{accepted.length}</strong>
                      </li>

                      <li>
                        <span>Submitted Bounties</span>
                        <strong>{submitted.length}</strong>
                      </li>

                      <li>
                        <span>Completed</span>
                        <strong>{completedCount}</strong>
                      </li>
                    </ul>
                  </div>

                  <div className="side-box">
                    <h2>
                      <Clock size={18} />
                      Recent Activity
                    </h2>

                    <ul className="activity-list">
                      <li>
                        On-chain activity history is not
                        available yet.
                      </li>
                    </ul>
                  </div>

                  <div className="side-box">
                    <button
                      type="button"
                      onClick={refresh}
                    >
                      <RotateCcw size={16} />
                      Refresh Bounties
                    </button>
                  </div>
                </aside>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
