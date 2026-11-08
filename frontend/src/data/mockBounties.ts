
import type { Bounty, BountyStatus } from "../types/bounty";

function makeBounty(
  id: string,
  title: string,
  description: string,
  rewardLamports: bigint,
  deadline: number,
  tags: string[],
  status: BountyStatus = "Open"
): Bounty {
  return {
    id,
    creator: "7xK...91p",
    worker: status === "Open" ? null : "9Ab...3Fg",
    title,
    descriptionRef: description,
    rewardLamports,
    deadline,
    status,
    submissionRef: null,
    tags,
  };
}

export const mockBounties: Bounty[] = [
  makeBounty(
    "1",
    "Build a Solana Dashboard",
    "Create a dashboard showing Solana wallet activity.",
    2_000_000_000n,
    1800000000,
    ["React", "TypeScript", "Solana"]
  ),
  makeBounty(
    "2",
    "Design a Web3 Landing Page",
    "Create a modern landing page for a Web3 application.",
    500_000_000n,
    1800300000,
    ["React", "UI/UX", "Design"]
  ),
  makeBounty(
    "3",
    "Write Anchor Program Tests",
    "Write comprehensive tests for a Solana smart contract.",
    1_000_000_000n,
    1800500000,
    ["Rust", "Solana", "Smart Contract"],
    "Accepted"
  ),
  makeBounty(
    "4",
    "Build Wallet Integration",
    "Connect Phantom wallet to a React application.",
    1_500_000_000n,
    1800800000,
    ["React", "TypeScript", "Solana"]
  ),
  makeBounty(
    "5",
    "Create NFT Marketplace UI",
    "Design a responsive NFT marketplace interface.",
    3_000_000_000n,
    1801000000,
    ["UI/UX", "Design", "React"]
  ),
  makeBounty(
    "6",
    "Review Smart Contract Security",
    "Review a Solana program for security vulnerabilities.",
    4_000_000_000n,
    1801200000,
    ["Rust", "Smart Contract", "Security"],
    "Submitted"
  ),
  makeBounty(
    "7",
    "Improve Transaction History",
    "Build a transaction history page for wallet activity.",
    750_000_000n,
    1801400000,
    ["TypeScript", "React", "UI/UX"],
    "Completed"
  ),
  makeBounty(
    "8",
    "Create a DeFi Analytics Page",
    "Develop a dashboard for decentralized finance analytics.",
    2_500_000_000n,
    1801600000,
    ["React", "DeFi", "TypeScript"]
  ),
  makeBounty(
    "9",
    "Optimize Solana Program",
    "Improve performance and compute usage in a Rust program.",
    3_500_000_000n,
    1801800000,
    ["Rust", "Solana", "Smart Contract"]
  ),
  makeBounty(
    "10",
    "Create Brand Identity",
    "Design a logo, colors, and brand guidelines for a Web3 project.",
    1_200_000_000n,
    1802000000,
    ["Design", "UI/UX", "Branding"]
  ),
];
