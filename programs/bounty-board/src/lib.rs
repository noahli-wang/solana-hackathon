pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod bounty;
pub mod accept_bounty;
<<<<<<< HEAD
pub mod approve_bounty;
pub mod cancel_bounty;

=======
pub mod submit_work;
>>>>>>> 3b30a9fa43651fb553e2a3d5037d3d6c9179b079

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use bounty::*;
pub use accept_bounty::*;
<<<<<<< HEAD
pub use approve_bounty::*;
pub use cancel_bounty::*;

=======
pub use submit_work::*;
>>>>>>> 3b30a9fa43651fb553e2a3d5037d3d6c9179b079

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

<<<<<<< HEAD
    //Fn for approving bounty
    pub fn approve_bounty(ctx: Context<ApproveBounty>) -> Result<()>{
        crate::approve_bounty::handler(ctx)
    }
    //Fn for canceling bounty
    pub fn cancel_bounty(ctx: Context<CancelBounty>) -> Result<()>{
        crate::cancel_bounty::handler(ctx)
=======
    //Fn for submitting work
    pub fn submit_work(
        ctx: Context<SubmitWork>,
        submission_ref:String,
    ) -> Result <()>{
        crate::submit_work::handler(ctx, submission_ref)
>>>>>>> 3b30a9fa43651fb553e2a3d5037d3d6c9179b079
    }
}
