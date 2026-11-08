import type {Bounty} from '../../types/bounty';
import './BountyDetails.css';
type Props={bounty:Bounty;
  saved:boolean;
  onBack:()=>void;
  onBookmark:()=>void};
export default function BountyDetails({
  bounty,
  saved,
  onBack,
  onBookmark
}: Props){
  const reward = Number(bounty.rewardLamports) / 1_000_000_000;

  const deadline = new Date(
    bounty.deadline * 1000
  ).toLocaleDateString();

  return (
    <main className="bounty-details">
      <button type="button" onClick={onBack}>
        Back to My Bounties
      </button>

      <h1>{bounty.title}</h1>

      <p>{bounty.descriptionRef}</p>

      <div className="bounty-reward">
        <strong>{reward} SOL</strong>
      </div>

      <div className="bounty-deadline">
        <strong>Deadline:</strong> {deadline}
      </div>

      <div className="bounty-tags">
        {bounty.tags.map((tag) => (
          <span key={tag} className="bounty-tag">
            {tag}
          </span>
        ))}
      </div>

    </main>
    );
}