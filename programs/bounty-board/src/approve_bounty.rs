use anchor_lang::prelude::*;
use crate::bounty::Bounty;
use crate::error::ErrorCode;

//List of all accounts required to approve the bounty
#[derive (Accounts)]
pub struct ApproveBounty<'info>{
    //Approving the bounty account
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
}
//ctx holds all accounts
pub fn handler(ctx: Context<ApproveBounty>) -> Result<()>{
    //checks that the signer is the creator
    require_keys_eq!(ctx.accounts.creator.key(),//wallet that signed the transaction
                      ctx.accounts.bounty.creator,//creator expected to be the same as the wallet that signed the transaction
                      ErrorCode::NotBountyCreator);//error code if the wallet that signed the transaction is not the creator of the bounty)

    //calls complete() helper to checkthat the satus of the bounty is submitted and the deadline has not passed, then sets the status to Completed
    ctx.accounts.bounty.complete()?;
    
    msg!("Bounty approved successfully!");

    //return "success"
    Ok(())
}