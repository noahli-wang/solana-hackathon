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

// Stores the information for a single bounty on Solana.


#[account]
#[derive(InitSpace)]
pub struct Bounty {
    // Wallet address of the person who created the bounty
    pub creator: Pubkey,

    // Wallet address of the assigned worker (None if unclaimed)
    pub worker: Option<Pubkey>,

    // Unique identifier for a creator's bounty
    pub bounty_id: u64,

    // Proposed payment amount in lamports (1 SOL = 1 billion lamports)
    pub reward_lamports: u64,

    // Short job title (maximum 64 bytes)
    #[max_len(64)]
    pub title: String,

    // Reference to the full job description (maximum 200 bytes)
    #[max_len(200)]
    pub description_ref: String,

    // Job deadline stored as a Unix timestamp
    pub deadline: i64,

    // Current stage of the bounty
    pub status: BountyStatus,

    // Reference to submitted work (None until work is submitted)
    #[max_len(200)]
    pub submission_ref: Option<String>,
}

// Defines the accounts required to create a new bounty.

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct CreateBounty<'info> {
    // Create a new bounty account at a deterministic PDA address
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

    // Creator signs the transaction and pays for account storage
    #[account(mut)]
    pub creator: Signer<'info>,

    // Solana's System Program is used to create the account
    pub system_program: Program<'info, System>,
}

// Validates inputs and initializes a new bounty account.


pub fn handler(
    ctx: Context<CreateBounty>,
    bounty_id: u64,
    title: String,
    description_ref: String,
    reward_lamports: u64,
    deadline: i64,
) -> Result<()> {
    // Validate the title and description reference
    require!(
        !title.is_empty() && title.len() <= 64,
        ErrorCode::InvalidTitle
    );

    require!(
        !description_ref.is_empty() && description_ref.len() <= 200,
        ErrorCode::InvalidDescription
    );

    // Require a positive proposed reward
    require!(
        reward_lamports > 0,
        ErrorCode::InvalidReward
    );

    // The deadline must be later than the blockchain's current time
    let current_time = Clock::get()?.unix_timestamp;

    require!(
        deadline > current_time,
        ErrorCode::InvalidDeadline
    );

    // Initialize the new bounty's fields
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

    msg!("Bounty created successfully!");

    Ok(())
}


// Functions that manage a bounty's state and business rules

impl Bounty {
    // Returns true if the bounty is open, unclaimed, and not expired
    pub fn is_available(&self, current_time: i64) -> bool {
        self.status == BountyStatus::Open
            && self.worker.is_none()
            && current_time < self.deadline
    }

    // Assigns a worker to an available bounty
    pub fn accept(
        &mut self,
        worker: Pubkey,
        current_time: i64,
    ) -> Result<()> {
        // Only open, unclaimed bounties can be accepted
        require!(
            self.status == BountyStatus::Open && self.worker.is_none(),
            ErrorCode::BountyNotOpen
        );

        // Expired bounties cannot be accepted
        require!(
            current_time < self.deadline,
            ErrorCode::BountyExpired
        );

        // The creator cannot accept their own bounty
        require!(
            worker != self.creator,
            ErrorCode::CannotAcceptOwnBounty
        );

        // Assign the worker and move to the Accepted state
        self.worker = Some(worker);
        self.status = BountyStatus::Accepted;

        Ok(())
    }

    //creator approves work (called by approve_bounty.rs) and sets the status to approved if the bounty is submitted and the deadline has not passed
    pub fn complete(&mut self) -> Result<()>{
        
        //can only approve a bounty after the worker has submitted
        require!(
            self.status == BountyStatus::Submitted,
            ErrorCode::InvalidStatus
        );
        
        self.status = BountyStatus::Completed;//bounty status set to complete

        Ok(())

    }

    //the creator cancels the bounty
    pub fn cancel(@mut self) -> Result<()>{
        //can only cancel the bounty when no one has accepted the job and the deadline has not passed
        require!(
            self.status == BountyStatus::Open, 
            ErrorCode::InvalidStatus
        );

        self.status = BountyStatus::Cancelled;//bounty status set to cancelled

        Ok(())
    }



}
