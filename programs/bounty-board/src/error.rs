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

<<<<<<< HEAD
    #[msg("Bounty not in the right status for this action")]
    InvalidStatus,

    #[msg("Only the creator of bounty can perform this action")]
    NotBountyCreator,



=======
    #[msg("Bounty mustbe accepted before submitting work")]
    BountyNotAccepted,

    #[msg("Only assigned worker can submit work")]
    UnauthorizedWorker,

    #[msg("Invalid submission reference")]
    InvalidSubmission,
    #[msg("Only the bounty creator can do this")]
    NotCreator,

    #[msg("Only the assigned worker can do this")]
    WrongWorker,

    #[msg("Bounty is not in the Accepted state")]
    BountyNotAccepted,

    #[msg("Work has not been submitted yet")]
    WorkNotSubmitted,

    #[msg("Submission reference must contain between 1 and 200 bytes")]
    InvalidSubmission,

    #[msg("Bounty can only be cancelled while being open, or after the deadline if the work has not been submitted")]
    CannotCancel,

    #[msg("Bounty account does not hold enough lamports to pay the reward")]
    InsufficientEscrow
>>>>>>> 3b30a9fa43651fb553e2a3d5037d3d6c9179b079
    }

 
