
export type BountyStatus =
  | "Open"
  | "Accepted"
  | "Submitted"
  | "Completed"
  | "Cancelled";

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
