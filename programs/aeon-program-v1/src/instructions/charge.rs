use anchor_lang::prelude::*;
use anchor_spl::{token::Token, token_interface::{Mint, TokenAccount}};

use crate::states::{
    vault::Vault,
    seeds::{SEED_PREFIX, VAULT_SEED, SERVICE_SEED, SUBSCRIPTION_SEED},
    service::Service,
    subscription::Subscription
};
use crate::utils::*;
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

#[derive(Accounts)]
#[instruction(_service_id: u64)]
pub struct ChargeToken<'info> {
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
    #[account(
        mut,
        constraint = subscriber_vault_ata.owner == subscriber_vault.key() @ Error::ATANotOwnedByVault
    )]
    pub subscriber_vault_ata: InterfaceAccount<'info, TokenAccount>,
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
    pub subscription: Account<'info, Subscription>,
    #[account()]
    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Program<'info, Token>
}

impl<'info> ChargeToken<'info> {
    pub fn perform_charge(ctx: Context<Self>, _service_id: u64) -> Result<()> {
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
            let subscriber = ctx.accounts.subscriber.key();
            let signer_seeds: &[&[&[u8]]] = &[&[SEED_PREFIX, VAULT_SEED, subscriber.as_ref(), &[ctx.accounts.subscriber_vault.bump]]];
            perform_token_transfer(
                ctx.accounts.subscriber_vault_ata.to_account_info(), 
                ctx.accounts.recipient.to_account_info(), 
                ctx.accounts.subscriber_vault.to_account_info(), 
                ctx.accounts.token_mint.to_account_info(), 
                ctx.accounts.token_program.to_account_info(), 
                plan.charge_amount, 
                ctx.accounts.token_mint.decimals, 
                signer_seeds
            )?;
            subscription.last_charge_ts = current_ts;
            subscription.next_charge_ts = subscription.last_charge_ts + plan.interval;
        } else {
            return err!(Error::NextChargeTsNotReached)
        }
        Ok(())
    }
}