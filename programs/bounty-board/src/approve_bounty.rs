use anchor_lang::prelude::*;
use crate::bounty::Bounty;
use crate::error::ErrorCode;

//List of all accounts required to approve the bounty
#[derive (Accounts)]
pub struct ApproveBounty<'info>{
    //Approving the bounty account (it also holds the escrowed reward)
    #[account(
        mut,
        seeds = [ b"bounty",
        bounty.creator.as_ref(), //creator's wallet adress
        &bounty.bounty_id.to_le_bytes()],//bounty's ID number in bytes

        //checks if the bounty account lives at the PDA address derived from the seeds and bump
    bump
    )]
    pub bounty: Account<'info, Bounty>, //bounty account to be approved

    //The creator must sign the transaction
    pub creator: Signer<'info>,

    //The worker who receives the reward. Must be the wallet that accepted the bounty,
    //otherwise anyone could pass in their own wallet and get paid.
    #[account(
        mut, //mut because its lamport balance goes up
        constraint = bounty.worker == Some(worker.key()) @ ErrorCode::WrongWorker
    )]
    pub worker: SystemAccount<'info>,
}

//ctx holds all accounts
pub fn handler(ctx: Context<ApproveBounty>) -> Result<()>{
    //checks that the signer is the creator
    require_keys_eq!(ctx.accounts.creator.key(),//wallet that signed the transaction
                      ctx.accounts.bounty.creator,//creator expected to be the same as the wallet that signed the transaction
                      ErrorCode::NotBountyCreator);//error code if the wallet that signed the transaction is not the creator of the bounty)

    //calls complete() helper to check that the status of the bounty is Submitted, then sets the status to Completed.
    //Doing this BEFORE paying means a bounty can never be paid twice: a second approve fails here.
    ctx.accounts.bounty.complete()?;

    //ESCROW RELEASE: move the reward from the bounty account to the worker.
    //The bounty account is owned by our program, so we can change its lamports directly
    //(the System Program's transfer only works FROM wallets it owns, like in bounty.rs).
    let reward = ctx.accounts.bounty.reward_lamports;
    let bounty_info = ctx.accounts.bounty.to_account_info();
    let worker_info = ctx.accounts.worker.to_account_info();

    let new_bounty_balance = bounty_info
        .lamports()
        .checked_sub(reward)
        .ok_or(ErrorCode::InsufficientEscrow)?;
    let new_worker_balance = worker_info
        .lamports()
        .checked_add(reward)
        .ok_or(ErrorCode::InsufficientEscrow)?;

    **bounty_info.try_borrow_mut_lamports()? = new_bounty_balance;
    **worker_info.try_borrow_mut_lamports()? = new_worker_balance;

    //The rent deposit stays in the bounty account so it can still be read (status = Completed).

    msg!("Bounty approved successfully! {} lamports paid to the worker", reward);

    //return "success"
    Ok(())
}
