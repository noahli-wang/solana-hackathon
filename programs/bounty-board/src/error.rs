use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the counter authority can update this counter")]
    Unauthorized,
    #[msg("Counter has reached the maximum value")]
    CounterOverflow,

    #[msg("Title must contain between 1 and 64 bytes")]
    InvalidTitle,

    #[msg("Reward must be greater than zero")]
    InvalidReward,

    #[msg("Invalid description reference")]
    InvalidDescription,

    #[msg("Deadline must be in the future")]
    InvalidDeadline,

    #[msg("Bounty is not open")]
    BountyNotOpen,

    #[msg("Bounty deadline has passed")]
    BountyExpired,

    #[msg("Creator cannot accept their own bounty")]
    CannotAcceptOwnBounty,

    #[msg("Bounty mustbe accepted before submitting work")]
    BountyNotAccepted,

    #[msg("Only assigned worker can submit work")]
    UnauthorizedWorker,

    #[msg("Invalid submission reference")]
    InvalidSubmission,
    }

 
