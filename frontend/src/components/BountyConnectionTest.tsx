
import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { getAllBounties } from "../services/bountyService";

export default function BountyConnectionTest() {
  const { connection } = useConnection();
  const [result, setResult] = useState("Checking Devnet...");

  useEffect(() => {
    let active = true;

    async function loadBounties() {
      try {
        const bounties = await getAllBounties(connection);

        if (active) {
          setResult(`Connected! Found ${bounties.length} bounty accounts.`);
          console.log("On-chain BountyBoard accounts:", bounties);
        }
      } catch (error) {
        console.error("Failed to fetch bounties:", error);

        if (active) {
          setResult("Connection failed. Check the browser console.");
        }
      }
    }

    loadBounties();

    return () => {
      active = false;
    };
  }, [connection]);

  return <p>{result}</p>;
}
