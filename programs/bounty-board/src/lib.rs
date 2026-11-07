pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod bounty;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use bounty::*;

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
}
