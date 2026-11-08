
use anchor_lang::prelude::*;
use crate::error::ErrorCode;

// Represents the different stages of a bounty's lifecycle.
#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Copy,
    PartialEq,
    Eq,
    InitSpace
)]
pub enum BountyStatus {
    Open,
    Accepted,
    Submitted,
    Completed,
    Cancelled,
}

// Stores information for a single bounty on Solana.
#[account]
#[derive(InitSpace)]
pub struct Bounty {
    // Wallet address of the bounty creator
    pub creator: Pubkey,

    // Wallet assigned to the bounty (None if unclaimed)
    pub worker: Option<Pubkey>,

    // Unique identifier for a creator's bounty
    pub bounty_id: u64,

    // Reward amount stored in lamports
    pub reward_lamports: u64,

    // Maximum 64 bytes
    #[max_len(64)]
    pub title: String,

    // Reference to the job description (maximum 200 bytes)
    #[max_len(200)]
    pub description_ref: String,

    // Deadline represented as a Unix timestamp
    pub deadline: i64,

    // Current bounty status
    pub status: BountyStatus,

    // Reference to submitted work
    #[max_len(200)]
    pub submission_ref: Option<String>,
}

// Accounts required to create a new bounty.
#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct CreateBounty<'info> {
    // PDA used to store the bounty and hold the reward
    #[account(
        init,
        payer = creator,
        space = 8 + Bounty::INIT_SPACE,
        seeds = [
            b"bounty",
            creator.key().as_ref(),
            &bounty_id.to_le_bytes()
        ],
        bump
    )]
    pub bounty: Account<'info, Bounty>,

    // Creator signs and pays for account creation
    #[account(mut)]
    pub creator: Signer<'info>,

    // System Program handles account creation and SOL transfers
    pub system_program: Program<'info, System>,
}

// Creates a bounty and transfers its reward into the bounty PDA.
pub fn handler(
    ctx: Context<CreateBounty>,
    bounty_id: u64,
    title: String,
    description_ref: String,
    reward_lamports: u64,
    deadline: i64,
) -> Result<()> {
    // Validate the title
    require!(
        !title.is_empty() && title.len() <= 64,
        ErrorCode::InvalidTitle
    );

    // Validate the description reference
    require!(
        !description_ref.is_empty() && description_ref.len() <= 200,
        ErrorCode::InvalidDescription
    );

    // Reward must be positive
    require!(
        reward_lamports > 0,
        ErrorCode::InvalidReward
    );

    // Check creator has enough lamports for the reward.
    // Note: this does not include rent or transaction fees.
    require!(
        ctx.accounts.creator.to_account_info().lamports()
            >= reward_lamports,
        ErrorCode::InsufficientEscrow
    );

    // Deadline must be in the future
    let current_time = Clock::get()?.unix_timestamp;

    require!(
        deadline > current_time,
        ErrorCode::InvalidDeadline
    );

    // Transfer the reward from the creator to the bounty PDA.
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.creator.to_account_info(),
        to: ctx.accounts.bounty.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.key(),
        cpi_accounts,
    );

    anchor_lang::system_program::transfer(
        cpi_ctx,
        reward_lamports,
    )?;

    // Initialize the bounty account
    let bounty = &mut ctx.accounts.bounty;

    bounty.creator = ctx.accounts.creator.key();
    bounty.worker = None;
    bounty.bounty_id = bounty_id;
    bounty.reward_lamports = reward_lamports;
    bounty.title = title;
    bounty.description_ref = description_ref;
    bounty.deadline = deadline;
    bounty.status = BountyStatus::Open;
    bounty.submission_ref = None;

    msg!("Bounty created and funded successfully!");

    Ok(())
}

// Methods that control a bounty's state and business rules.
impl Bounty {
    // Check whether the bounty can be accepted.
    pub fn is_available(&self, current_time: i64) -> bool {
        self.status == BountyStatus::Open
            && self.worker.is_none()
            && current_time < self.deadline
    }

    // Assign a worker to an available bounty.
    pub fn accept(
        &mut self,
        worker: Pubkey,
        current_time: i64,
    ) -> Result<()> {
        // Bounty must be open and unclaimed
        require!(
            self.status == BountyStatus::Open
                && self.worker.is_none(),
            ErrorCode::BountyNotOpen
        );

        // Deadline must not have passed
        require!(
            current_time < self.deadline,
            ErrorCode::BountyExpired
        );

        // Creator cannot accept their own bounty
        require!(
            worker != self.creator,
            ErrorCode::CannotAcceptOwnBounty
        );

        // Assign the worker and update the status
        self.worker = Some(worker);
        self.status = BountyStatus::Accepted;

        Ok(())
    }

    // Submit completed work for the creator to review.
    pub fn submit_work(
        &mut self,
        worker: Pubkey,
        submission_ref: String,
        current_time: i64,
    ) -> Result<()> {
        // Bounty must be accepted
        require!(
            self.status == BountyStatus::Accepted,
            ErrorCode::BountyNotAccepted
        );

        // Only the assigned worker can submit
        require!(
            self.worker == Some(worker),
            ErrorCode::UnauthorizedWorker
        );

        // Validate the submission reference
        require!(
            !submission_ref.is_empty()
                && submission_ref.len() <= 200,
            ErrorCode::InvalidSubmission
        );

        // Submission must occur before the deadline
        require!(
            current_time < self.deadline,
            ErrorCode::BountyExpired
        );

        // Record the submission and update the status
        self.submission_ref = Some(submission_ref);
        self.status = BountyStatus::Submitted;

        Ok(())
    }

    // Complete a bounty after work has been submitted.
    // Called by the approve_bounty instruction.
    pub fn complete(&mut self) -> Result<()> {
        require!(
            self.status == BountyStatus::Submitted,
            ErrorCode::InvalidStatus
        );

        self.status = BountyStatus::Completed;

        Ok(())
    }

    // Cancel an open bounty.
    // Called by the cancel_bounty instruction.
    pub fn cancel(&mut self) -> Result<()> {
        require!(
            self.status == BountyStatus::Open,
            ErrorCode::InvalidStatus
        );

        self.status = BountyStatus::Cancelled;

        Ok(())
    }
}
