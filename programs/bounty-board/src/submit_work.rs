use anchor_lang::prelude::*;
use crate::bounty::Bounty;

//Defines accounts needed to submit work
#[derive(Accounts)]
pub struct SubmitWork<'info>{

    //Existing bounty being submitted
    #[account(
        mut,
        seeds = [
            b"bounty",
            bounty.creator.as_ref(),
            &bounty.bounty_id.to_le_bytes()
        ],
        bump
    )]

    pub bounty: Account<'info,Bounty>,

    //Wallet submitting the work must sign
    pub worker: Signer<'info>
}

//Validates the worker and updates the bounty's state
pub fn handler(
    ctx: Context<SubmitWork>,
    submission_ref: String,
) -> Result <()>    {

    //Get current block chain time 
    let current_time = Clock::get()?.unix_timestamp;

    //Identify the wallet submitting the work
    let worker = ctx.accounts.worker.key();


    //Validate and record the submission
    ctx.accounts.bounty.submit_work(
        worker,
        submission_ref,
        current_time
    )?;
    msg!("Work submitted successfully!");

    Ok(())
}