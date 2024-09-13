use std::borrow::BorrowMut;

use anchor_lang::prelude::*;
use crate::states::{
    seeds::{SEED_PREFIX, SERVICE_SEED}, 
    service::Service
};

#[derive(Accounts)]
#[instruction(_id: u64)]
pub struct ServiceStatusUpdate<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PREFIX, SERVICE_SEED, owner.key().as_ref(), &_id.to_le_bytes()],
        bump = service.bump
    )]
    pub service: Account<'info, Service>
}

impl<'info> ServiceStatusUpdate<'info> {
    pub fn perform_update(ctx: Context<ServiceStatusUpdate>, _id: u64, is_active: bool) -> Result<()> {
        let service = ctx.accounts.service.borrow_mut();
        service.is_active = is_active;
        Ok(())
    }
}