import { useState } from "react";
import {CalendarDays,
        Coins,
        BarChart3, 
        Clock,
        Plus} from "lucide-react";
import { mockBounties } from "../../data/mockBounties";
import "./MyBountiesPage.css"
import type { Bounty } from "../../types/bounty";

// The 3 tabs on this page
type Tab = "created" | "accepted" | "submitted";


const CREATOR_WALLET = "7xK...91p"; //Mock wallet adress for creator
const MY_WORKER_WALLET = "9Ab...3Fg"; //Mock wallet adress for worker

//shape of a line in the activity feed
//id is the unique number so React can track each line and text is the content of the line
interface Activity{
    id: number;
    text: string;
}

//Convert lamports into SOL
function formatSol(lamports: bigint): string {
    return `${Number(lamports) / 1_000_000_000} SOL`;
}

//turn the unix timestamp (seconds) into human readable data
function formatDate(seconds: number): string {
    return new Date(seconds * 1000).toLocaleDateString();
}

//Things App.tsx can pass into this page
interface MyBountiesPageProps {
    //Called when "Create Bounty" is clicked (optional until the Create page exists)
    onCreateBounty?: () => void;
}

export default function MyBountiesPage({ onCreateBounty }: MyBountiesPageProps){
    //Select active tab. Starts with "created" tab
    const[activeTab, setActiveTab] = useState<Tab>("created");
    //Editable copy of bounties, setBounties updates the screen when bounties are changed
    const [bounties, setBounties] = useState<Bounty[]>(mockBounties);

    //Recent activity feed, starts with welcome message. setActivity updates the screen when new activity is added
    const [activity, setActivity] = useState<Activity[]>([
        {id:1, text: "Welcome! This is your activity feed. It will show your recent actions."}//starting message as empty
    ]);

    //splitting bounties into 3 groups based on the active tab
    const created = bounties.filter((b) => b.creator === CREATOR_WALLET);
    const accepted = bounties.filter((b) => b.worker === MY_WORKER_WALLET);
    const submitted = accepted.filter((b) => b.status === "Submitted" || b.status === "Completed")

    //tab section and how many bouties each tab has
    const tabs:{id: Tab; label: string; count: number}[] = [
        {id: "created", label: "Created", count: created.length},
        {id: "accepted", label: "Accepted", count: accepted.length},
        {id: "submitted", label: "Submitted", count: submitted.length},
    ];
    
    //bounties to show for the selected tab. If the active tab is "created", show created bounties, if "accepted" show accepted bounties, if "submitted" show submitted bounties
    const visibleBounties = activeTab === "created" ? created : activeTab === "accepted" ? accepted : submitted;

    //Count of completed bounties for the summary section
    const completedCount = bounties.filter((b) => b.status === "Completed" && (b.creator === CREATOR_WALLET || b.worker ===MY_WORKER_WALLET)).length;
    //Numbers for activity feed
    function addActivity(text:string){
        setActivity((prevActivity) => [{id: Date.now(), text}, ...prevActivity]); //add new activity to the top of the feed
    }

    //change bounty status on screen
    function updateStatus(id:string, status: Bounty["status"]){
        setBounties((prevBounties) => prevBounties.map((b) => b.id === id ? {...b, status} : b)); //update the status of the bounty with the given id
    }

    //creator approves submitted work and call the approve_bounty instruction 
    function handleApprove(b:Bounty){
        updateStatus(b.id, "Completed");
        addActivity(`Approved "${b.title}". Worker paid ${formatSol(b.rewardLamports)}.`);
    }

    //creator cancel open bounty and calls the cancel_bounty instruction
    function handleCancel(b:Bounty){
        updateStatus(b.id, "Cancelled");
        addActivity(`Cancelled "${b.title}". Reward refunded.`);
    }

    return (
    <main className="my-bounties-page">
      {/* Title on the left, Create Bounty button on the right */}
      <div className="my-bounties-heading">
        <div>
          <h1>My Bounties</h1>
          <p>Manage the bounties you've created, accepted, or submitted.</p>
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

      {/* Tab selector */}
      <div className="tab-selector">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="my-bounties-layout">
        {/* Left side: the list of bounty cards */}
        <section className="my-bounty-list">
          {visibleBounties.length === 0 && (
            <p className="empty-message">No bounties here yet.</p>
          )}

          {visibleBounties.map((bounty) => (
            <article key={bounty.id} className="my-bounty-card">
              <div className="my-bounty-card-header">
                <h3>{bounty.title}</h3>
                <span className={`mb-status mb-status-${bounty.status.toLowerCase()}`}>
                  {bounty.status}
                </span>
              </div>

              <p className="my-bounty-description">{bounty.descriptionRef}</p>

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

                {/* Buttons only on the Created tab, and only when the action is allowed */}
                {activeTab === "created" && (
                  <div className="my-bounty-actions">
                    {bounty.status === "Submitted" && (
                      <button
                        type="button"
                        className="action-button approve"
                        onClick={() => handleApprove(bounty)}
                      >
                        Approve
                      </button>
                    )}

                    {bounty.status === "Open" && (
                      <button
                        type="button"
                        className="action-button cancel"
                        onClick={() => handleCancel(bounty)}
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

        {/* Right side: summary and activity */}
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
              {activity.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}




