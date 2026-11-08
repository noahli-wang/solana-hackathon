
import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

import { getAllBounties } from "../services/bountyService";
import type { Bounty } from "../types/bounty";

export function useLiveBounties() {
  const { connection } = useConnection();

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const results = await getAllBounties(connection);

        if (!cancelled) {
          setBounties(results);
        }
      } catch (err) {
        console.error("Failed to load Devnet bounties:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to fetch Devnet bounties"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [connection, refreshCount]);

  function refresh() {
    setRefreshCount((count) => count + 1);
  }

  return { bounties, loading, error, refresh };
}
