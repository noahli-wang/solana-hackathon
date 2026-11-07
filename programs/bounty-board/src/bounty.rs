use anchor_lang::prelude::*;
use crate::error::ErrorCode;


//Possible stages within the bounty
#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Copy,
    PartialEq,
    Eq,
    InitSpace
)]

pub enum BountyStatus{
    Open,
    Accepted,
    Submitted,
    Completed,
    Cancelled,
}

//Bounty record recorded on Blockchain String
#[account]
#[derive(InitSpace)]

//Bounty class
pub struct Bounty{
    //Wallet created for the bounty
    pub creator: Pubkey,

    //Wallet that accepts the bounty
    pub worker: Option<Pubkey>,

    //Unique ID for creator's bounty
    pub bounty_id: u64,

    //Reward in Lamports of Solana currency
    pub reward_lamports: u64,

    //Max title length: 64 bits
    #[max_len(64)]
    pub title: String,

    //Reference to job description
    #[max_len(200)]
    pub description_ref: String,

    //Deadline of the bounty as a timestamp
    pub deadline: i64,

    //Current state of bounty
    pub status: BountyStatus,

    //Reference to submitted work
    #[max_len(200)]
    pub submission_ref: Option<String>,


}

//Accounts needed to create bounty
#[derive(Accounts)]
#[instruction(bounty_id:u64)]

pub struct CreateBounty<'info> {
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

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}


//Logic for creating the bounty
pub fn handler(
    ctx: Context<CreateBounty>,
    bounty_id:u64,
    title:String,
    description_ref: String,
    reward_lamports: u64,
    deadline: i64,
) -> Result<()> {
    //Reject invalid input for title
    require!(
        !title.is_empty() && title.len() <= 64,
        ErrorCode::InvalidTitle
    );

    //Rewards for the job is above 0 lamports
    require!(
        reward_lamports >0,
        ErrorCode::InvalidReward
    );

    //Description cannot be empty or more then 200 
    require!(
        !description_ref.is_empty() && description_ref.len() <= 200,
        ErrorCode::InvalidDescription
    );

    //Deadline has to be in the future 
    let current_time = Clock::get()?.unix_timestamp;

    require!(
        deadline > current_time,
        ErrorCode::InvalidDeadline
    );

    //Access the newly created bounty
    let bounty = &mut ctx.accounts.bounty;

    //Storing starting variables in the bounty
    bounty.creator = ctx.accounts.creator.key();
    bounty.worker = None;
    bounty.bounty_id = bounty_id;
    bounty.title = title;
    bounty.reward_lamports = reward_lamports;
    bounty.description_ref = description_ref;
    bounty.deadline = deadline;
    bounty.status = BountyStatus::Open;
    bounty.submission_ref = None;


    msg!("Bounty has been created succcessfully!");

    Ok(())
}


    