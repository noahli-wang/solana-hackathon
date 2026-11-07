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

    #[msg("Bounty not in the right status for this action")]
    InvalidStatus,

    #[msg("Only the creator of bounty can perform this action")]
    NotBountyCreator,



    }

 
