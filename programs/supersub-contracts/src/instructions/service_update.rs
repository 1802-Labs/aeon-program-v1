use anchor_lang::prelude::*;
use crate::states::{
    seeds::{SEED_PREFIX, SERVICE_SEED}, 
    service::{Service, Plan}
};
use crate::instructions::PlanInfo;
use crate::errors::Error;

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
        let service = &mut ctx.accounts.service;
        service.is_active = is_active;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(_service_id: u64)]
pub struct PlanStatusUpdate<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PREFIX, SERVICE_SEED, owner.key().as_ref(), &_service_id.to_le_bytes()],
        bump = service.bump
    )]
    pub service: Account<'info, Service>
}

impl<'info> PlanStatusUpdate<'info> {
    pub fn perform_update(ctx: Context<PlanStatusUpdate>, _service_id: u64, plan_id: u64, is_active: bool) -> Result<()> {
        let service = &mut ctx.accounts.service;
        if let Some(plan) = service.plans.iter_mut().find(|p| p.id == plan_id) {
            plan.is_active = is_active
        } else {
            return err!(Error::PlanNotFound)
        };
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(_service_id: u64)]
pub struct PlanAdd<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PREFIX, SERVICE_SEED, owner.key().as_ref(), &_service_id.to_le_bytes()],
        bump = service.bump,
        realloc = 8 + Plan::INIT_SPACE + Service::size(service.plans.len()),
        realloc::payer = fee_payer,
        realloc::zero = false,
    )]
    pub service: Account<'info, Service>,
    pub system_program: Program<'info, System>
}

impl<'info> PlanAdd<'info> {
    pub fn perform_add(ctx: Context<PlanAdd>, _service_id: u64, plan_info: PlanInfo) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let new_plan = Plan {
            id: (service.plans.len() + 1) as u64,
            charge_amount: plan_info.charge_amount,
            created_at: Clock::get()?.unix_timestamp as u64,
            interval: plan_info.interval,
            token_mint: plan_info.token_mint,
            recipient: plan_info.recipient,
            is_active: true
        };
        service.plans.push(new_plan);
        Ok(())
    }
}