
/**
 * The possible states of a bounty on Solana.
 */
export type BountyStatus =
  | "Open"
  | "Accepted"
  | "Submitted"
  | "Completed"
  | "Cancelled";

/**
 * A bounty fetched from the Solana blockchain.
 *
 * Used by BrowsePage, MyBountiesPage,
 * BountyCard, and BountyDescPage.
 */
export interface Bounty {
  id: string;
  creator: string;
  worker: string | null;
  title: string;
  descriptionRef: string;
  rewardLamports: bigint;
  deadline: number;
  status: BountyStatus;
  submissionRef: string | null;
  tags: string[];
  requirements?: string[];
}

/**
 * Form data before a bounty is created on Solana.
 *
 * Used by CreateBounty.tsx.
 */
export interface BountyDraft {
  title: string;
  description: string;
  reward: number;
  deadline: string;
  category: string;
  tags: string[];
}

/**
 * Available categories in the Create Bounty form.
 *
 * "All" is the default option.
 */
export const categories = [
  "All",
  "Development",
  "Design",
  "Writing",
  "Marketing",
  "Research",
  "Other",
] as const;

/**
 * Format a reward amount in SOL.
 *
 * Example:
 * sol(1.5) -> "1.5 SOL"
 */
export function sol(amount: number): string {
  return `${amount.toLocaleString("en-US", {
    maximumFractionDigits: 9,
  })} SOL`;
}

/**
 * Convert a date into a readable format.
 *
 * Example:
 * dateLabel("2026-11-08") -> "Nov 8, 2026"
 */
export function dateLabel(date: string): string {
  if (!date) {
    return "No deadline";
  }

  // Parse date-only strings as local dates,
  // avoiding unwanted UTC timezone shifts.
  const [year, month, day] = date.split("-").map(Number);

  const parsedDate = new Date(year, month - 1, day);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Convert SOL into lamports.
 *
 * 1 SOL = 1,000,000,000 lamports.
 */
export function solToLamports(amount: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid SOL amount");
  }

  return BigInt(Math.round(amount * 1_000_000_000));
}

/**
 * Convert lamports into SOL.
 */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000;
}
