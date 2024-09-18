use anchor_lang::prelude::*;

use crate::states::{
    vault::Vault, 
    seeds::{SEED_PREFIX, VAULT_SEED, SERVICE_SEED, SUBSCRIPTION_SEED}, 
    service::Service,
    subscription::Subscription
};
use crate::errors::Error;

#[derive(Accounts)]
#[instruction(_service_id: u64)]
pub struct SubscribeSOL<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut)]
    pub subscriber: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PREFIX, VAULT_SEED, subscriber.key().as_ref()],
        bump = subscriber_vault.bump
    )]
    pub subscriber_vault: Account<'info, Vault>,
    pub service_provider: SystemAccount<'info>,
    #[account(
        seeds = [SEED_PREFIX, SERVICE_SEED, service_provider.key().as_ref(), &_service_id.to_le_bytes()],
        bump = service.bump,
        constraint = service.is_active @ Error::InactiveService
    )]
    pub service: Account<'info, Service>,
    #[account(mut)]
    /// CHECK: Verification already done in the perform-create handler
    pub recipient: UncheckedAccount<'info>,
    #[account(
        init,
        payer = fee_payer,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [SEED_PREFIX, SUBSCRIPTION_SEED, subscriber.key().as_ref(), service.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    pub system_program: Program<'info, System>
}

impl<'info> SubscribeSOL<'info> {
    pub fn perform_subscribe(ctx: Context<Self>, _service_id: u64, plan_id: u64) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let subscription = &mut ctx.accounts.subscription;
        if let Some(plan) = service.plans.iter().find(|p| p.id == plan_id) {
            if !plan.is_active {
                return err!(Error::InactivePlan);
            } else {
                if plan.recipient.key() != ctx.accounts.recipient.key() {
                    return err!(Error::RecipientMismatch);
                }
                ctx.accounts.subscriber_vault.sub_lamports(plan.charge_amount)?;
                ctx.accounts.recipient.add_lamports(plan.charge_amount)?;
                subscription.plan_id = plan.id;
            }
        } else {
            return err!(Error::PlanNotFound)
        };
        subscription.is_active = true;
        subscription.service_key = service.key();
        subscription.owner = ctx.accounts.subscriber.key();
        subscription.last_charge_ts = Clock::get().unwrap().unix_timestamp as u64;
        subscription.bump = ctx.bumps.subscription;
        Ok(())
    }
}