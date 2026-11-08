import type { BountyStatus } from "../../types/bounty";

const LAMPORTS_PER_SOL = 1_000_000_000;

// 2_000_000_000n -> "2.0"
export function formatSol(lamports: bigint) {
  return (Number(lamports) / LAMPORTS_PER_SOL).toFixed(1);
}

// Unix seconds -> "Jan 30, 2025"
export function formatDeadline(deadline: number) {
  return new Date(deadline * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Text shown at the top of the Submission / Progress panel
export function getProgressMessage(
  status: BountyStatus,
  acceptedByMe: boolean
) {
  switch (status) {
    case "Open":
      return {
        title: "Not accepted yet.",
        body: "Accept this bounty to start working and submit your work here.",
      };
    case "Accepted":
      return acceptedByMe
        ? {
            title: "You accepted this bounty.",
            body: "Submit your work here when it's ready for review.",
          }
        : {
            title: "Already accepted.",
            body: "Another contributor is working on this bounty.",
          };
    case "Submitted":
      return {
        title: "Work submitted.",
        body: "Waiting for the creator to review and approve.",
      };
    case "Completed":
      return {
        title: "Bounty completed.",
        body: "The reward has been paid out to the contributor.",
      };
    case "Cancelled":
      return {
        title: "Bounty cancelled.",
        body: "The creator cancelled this bounty.",
      };
  }
}
