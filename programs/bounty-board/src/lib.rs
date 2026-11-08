pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod bounty;
pub mod accept_bounty;
pub mod submit_work;
pub mod approve_bounty;
pub mod cancel_bounty;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use bounty::*;
pub use accept_bounty::*;
pub use submit_work::*;
pub use approve_bounty::*;
pub use cancel_bounty::*;

declare_id!("DorphgTj2n5swnnt53Edymkds7P1MDjoKfQRRNC79weT");

#[program]
pub mod bounty_board {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        crate::instructions::initialize::handle_initialize(ctx)
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        crate::instructions::increment::handle_increment(ctx)
    }

    //Fn for creating a bounty (locks the reward in escrow)
    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        bounty_id: u64,
        title: String,
        description_ref: String,
        reward_lamports: u64,
        deadline: i64,
    ) -> Result<()> {
        crate::bounty::handler(
            ctx,
            bounty_id,
            title,
            description_ref,
            reward_lamports,
            deadline,
        )
    }

    //Fn for accepting bounty
    pub fn accept_bounty(
        ctx: Context<AcceptBounty>,
    ) -> Result <()> {
        crate::accept_bounty::handler(ctx)
    }

    //Fn for submitting work
    pub fn submit_work(
        ctx: Context<SubmitWork>,
        submission_ref:String,
    ) -> Result <()>{
        crate::submit_work::handler(ctx, submission_ref)
    }

    //Fn for approving bounty (pays the escrowed reward to the worker)
    pub fn approve_bounty(ctx: Context<ApproveBounty>) -> Result<()>{
        crate::approve_bounty::handler(ctx)
    }

    //Fn for canceling bounty (refunds the escrowed reward to the creator)
    pub fn cancel_bounty(ctx: Context<CancelBounty>) -> Result<()>{
        crate::cancel_bounty::handler(ctx)
    }
}
