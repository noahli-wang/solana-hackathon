use anchor_lang::prelude::*;
use crate::bounty::Bounty;
use crate::error::ErrorCode;

//List of all accounts required to cancel the bounty
#[derive (Accounts)]
pub struct CancelBounty<'info>{
    //Cancelling the bounty account (it also holds the escrowed reward)
    #[account(
        mut,
        seeds = [ b"bounty",
        bounty.creator.as_ref(), //creator's wallet adress
        &bounty.bounty_id.to_le_bytes()],//bounty's ID number in bytes

        //checks if the bounty account lives at the PDA address derived from the seeds and bump
    bump
    )]
    pub bounty: Account<'info, Bounty>, //bounty account to be canceled

    //The creator must sign the transaction, and gets the reward refunded
    #[account(mut)] //mut because its lamport balance goes up
    pub creator: Signer<'info>,
}

//ctx holds all accounts
pub fn handler(ctx: Context<CancelBounty>) -> Result<()>{
    //checks that the signer is the creator
    require_keys_eq!(ctx.accounts.creator.key(),//wallet that signed the transaction
                      ctx.accounts.bounty.creator,//creator expected to be the same as the wallet that signed the transaction
                      ErrorCode::NotBountyCreator);//error code if the wallet that signed the transaction is not the creator of the bounty)

    //calls cancel() helper to check that the status of the bounty is still Open, then sets the status to cancelled.
    //Doing this BEFORE refunding means a bounty can never be refunded twice: a second cancel fails here.
    ctx.accounts.bounty.cancel()?;

    //ESCROW REFUND: move the reward from the bounty account back to the creator.
    //The bounty account is owned by our program, so we can change its lamports directly.
    let reward = ctx.accounts.bounty.reward_lamports;
    let bounty_info = ctx.accounts.bounty.to_account_info();
    let creator_info = ctx.accounts.creator.to_account_info();

    let new_bounty_balance = bounty_info
        .lamports()
        .checked_sub(reward)
        .ok_or(ErrorCode::InsufficientEscrow)?;
    let new_creator_balance = creator_info
        .lamports()
        .checked_add(reward)
        .ok_or(ErrorCode::InsufficientEscrow)?;

    **bounty_info.try_borrow_mut_lamports()? = new_bounty_balance;
    **creator_info.try_borrow_mut_lamports()? = new_creator_balance;

    //The rent deposit stays in the bounty account so it can still be read (status = Cancelled).

    msg!("Bounty canceled successfully! {} lamports refunded to the creator", reward);

    //return "success"
    Ok(())
}
