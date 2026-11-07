use anchor_lang::prelude::*;
use crate::bounty::Bounty;
use crate::error::ErrorCode;

//List of all accounts required to cancel the bounty
#[derive (Accounts)]
pub struct CancelBounty<'info>{
    //Cancelling the bounty account
    #[account(
        mut,
        seeds = [ b"bounty", 
        bounty.creator.as_ref(), //creator's wallet adress
        &bounty.bounty_id.to_le_bytes()],//bounty's ID number in bytes


        //checks if the bounty account lives at the PDA address derived from the seeds and bump
    bump 
    )]
    


    pub bounty: Account<'info, Bounty>, //bounty account to be canceled

    //The creator must sign the transaction
    pub creator: Signer<'info>,
}
//ctx holds all accounts
pub fn handler(ctx: Context<CancelBounty>) -> Result<()>{
    //checks that the signer is the creator
    require_keys_eq!(ctx.accounts.creator.key(),//wallet that signed the transaction
                      ctx.accounts.bounty.creator,//creator expected to be the same as the wallet that signed the transaction
                      ErrorCode::NotBountyCreator);//error code if the wallet that signed the transaction is not the creator of the bounty)

    //calls cancel() helper to check that the status of the bounty is still Open, then sets the status to cancelled
    ctx.accounts.bounty.cancel()?;
    
    msg!("Bounty canceled successfully!");

    //return "success"
    Ok(())
}