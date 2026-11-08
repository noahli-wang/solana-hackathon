import type { Bounty } from "../../types/bounty";

interface BountyDescriptionCardProps {
  bounty: Bounty;
}

// Description, requirements and tags
export default function BountyDescriptionCard({
  bounty,
}: BountyDescriptionCardProps) {
  const requirements = bounty.requirements ?? [];

  return (
    <article className="details-card">
      <h3>Description</h3>
      <p className="details-description">{bounty.descriptionRef}</p>

      {requirements.length > 0 && (
        <>
          <h3>Requirements</h3>
          <ul className="details-requirements">
            {requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </>
      )}

      {bounty.tags.length > 0 && (
        <div className="bounty-tags details-tags">
          {bounty.tags.map((tag) => (
            <span key={tag} className="bounty-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
