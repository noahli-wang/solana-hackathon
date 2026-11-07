
use anchor_lang::prelude::*;
use crate::bounty::Bounty;

// Accounts required to accept an existing bounty
#[derive(Accounts)]
pub struct AcceptBounty<'info> {
    #[account(
        mut,
        seeds = [
            b"bounty",
            bounty.creator.as_ref(),
            &bounty.bounty_id.to_le_bytes()
        ],
        bump
    )]
    pub bounty: Account<'info, Bounty>,

    // The worker must sign the transaction
    pub worker: Signer<'info>,
}

// Handles acceptance of an existing bounty
pub fn handler(ctx: Context<AcceptBounty>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let worker = ctx.accounts.worker.key();

    ctx.accounts.bounty.accept(worker, current_time)?;

    msg!("Bounty accepted successfully!");

    Ok(())
}
