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
pub struct ChargeSOL<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account()]
    pub subscriber: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [SEED_PREFIX, VAULT_SEED, subscriber.key().as_ref()],
        bump = subscriber_vault.bump
    )]
    pub subscriber_vault: Account<'info, Vault>,
    /// CHECK: Verification already done in the perform-create handler
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
    pub service_provider: SystemAccount<'info>,
    #[account(
        seeds = [SEED_PREFIX, SERVICE_SEED, service_provider.key().as_ref(), &_service_id.to_le_bytes()],
        bump = service.bump,
        constraint = service.is_active @ Error::InactiveService
    )]
    pub service: Account<'info, Service>,
    #[account(
        mut,
        seeds = [SEED_PREFIX, SUBSCRIPTION_SEED, subscriber.key().as_ref(), service.key().as_ref()],
        bump = subscription.bump,
        constraint = subscription.is_active @ Error::InactiveSubscription
    )]
    pub subscription: Account<'info, Subscription>
}

impl<'info> ChargeSOL<'info> {
    pub fn perform_charge(ctx: Context<Self>, _service_id: u64) -> Result<()> {
        // get plan and 
        let service = &ctx.accounts.service;
        let subscription = &mut ctx.accounts.subscription;
        let plan = service.get_plan(subscription.plan_id).unwrap();
        if !plan.is_active {
            return err!(Error::InactivePlan);
        }
        if plan.recipient.key() != ctx.accounts.recipient.key() {
            return err!(Error::RecipientMismatch);
        }
        let current_ts = Clock::get().unwrap().unix_timestamp as u64;
        if current_ts >= subscription.next_charge_ts {
            ctx.accounts.subscriber_vault.sub_lamports(plan.charge_amount)?;
            ctx.accounts.recipient.add_lamports(plan.charge_amount)?;
            subscription.last_charge_ts = current_ts;
            subscription.next_charge_ts = subscription.last_charge_ts + plan.interval;
        } else {
            return err!(Error::NextChargeTsNotReached)
        }
        Ok(())
    }
}