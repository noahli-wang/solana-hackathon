
use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // Starter counter errors
    #[msg("Only the counter authority can update this counter")]
    Unauthorized,

    #[msg("Counter has reached the maximum value")]
    CounterOverflow,

    // Bounty creation errors
    #[msg("Title must contain between 1 and 64 bytes")]
    InvalidTitle,

    #[msg("Reward must be greater than zero")]
    InvalidReward,

    #[msg("Invalid description reference")]
    InvalidDescription,

    #[msg("Deadline must be in the future")]
    InvalidDeadline,

    // Bounty acceptance errors
    #[msg("Bounty is not open")]
    BountyNotOpen,

    #[msg("Bounty deadline has passed")]
    BountyExpired,

    #[msg("Creator cannot accept their own bounty")]
    CannotAcceptOwnBounty,

    // General bounty permission and status errors
    #[msg("Bounty is not in the right status for this action")]
    InvalidStatus,

    #[msg("Only the creator of the bounty can perform this action")]
    NotBountyCreator,

    #[msg("Only the bounty creator can do this")]
    NotCreator,

    #[msg("Only the assigned worker can do this")]
    WrongWorker,

    // Work submission errors
    #[msg("Bounty must be accepted before submitting work")]
    BountyNotAccepted,

    #[msg("Only the assigned worker can submit work")]
    UnauthorizedWorker,

    #[msg("Submission reference must contain between 1 and 200 bytes")]
    InvalidSubmission,

    // Approval errors
    #[msg("Work has not been submitted yet")]
    WorkNotSubmitted,

    // Cancellation errors
    #[msg("Bounty can only be cancelled while open, or after the deadline if work has not been submitted")]
    CannotCancel,

    // Escrow errors
    #[msg("Bounty account does not hold enough lamports to pay the reward")]
    InsufficientEscrow,
}
