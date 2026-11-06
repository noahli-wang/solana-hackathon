use anchor_lang::prelude::*;
use crate::error::ErrorCode;
//Bounty record recorded on Blockchain String
#[account]
#[derive(InitSpace)]

//Bounty class
pub struct Bounty{
    //Wallet created for the bounty
    pub creator: Pubkey,

    //Unique ID for creator's bounty
    pub bounty_id: u64,

    //Reward in Lamports of Solana currency
    pub reward_lamports: u64,

    //Max title length: 64 bits
    #[max_len(64)]
    pub title: String,

    //Bounty avaiable?
    pub is_open: bool,
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
    reward_lamports: u64,
) -> Result<()> {
    //Reject invalid input
    require!(
        !title.is_empty() && title.len() <= 64,
        ErrorCode::InvalidTitle
    );

    require!(
        reward_lamports >0,
        ErrorCode::InvalidReward
    );

    //Access the newly created bounty
    let bounty = &mut ctx.accounts.bounty;

    //Saving the bounty information
    bounty.creator = ctx.accounts.creator.key();
    bounty.bounty_id = bounty_id;
    bounty.title = title;
    bounty.reward_lamports = reward_lamports;
    bounty.is_open = true;

    msg!("Bounty has been created succcessfully!");

    Ok(())
}


