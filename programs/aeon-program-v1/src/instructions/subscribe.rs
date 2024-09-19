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
        let plan = service.get_plan(plan_id).unwrap();
        if !plan.is_active {
            return err!(Error::InactivePlan);
        }
        if plan.recipient.key() != ctx.accounts.recipient.key() {
            return err!(Error::RecipientMismatch);
        }
        ctx.accounts.subscriber_vault.sub_lamports(plan.charge_amount)?;
        ctx.accounts.recipient.add_lamports(plan.charge_amount)?;
        subscription.plan_id = plan.id;
        subscription.is_active = true;
        subscription.service_key = service.key();
        subscription.owner = ctx.accounts.subscriber.key();
        subscription.last_charge_ts = Clock::get().unwrap().unix_timestamp as u64;
        subscription.next_charge_ts = subscription.last_charge_ts + plan.interval;
        subscription.bump = ctx.bumps.subscription;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(_service_id: u64)]
pub struct SubscribeToken<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut)]
    pub subscriber: Signer<'info>,
    #[account(
        seeds = [SEED_PREFIX, VAULT_SEED, subscriber.key().as_ref()],
        bump = subscriber_vault.bump
    )]
    pub subscriber_vault: Account<'info, Vault>,
    #[account(
        mut,
        constraint = subscriber_vault_ata.owner == subscriber_vault.key() @ Error::ATANotOwnedByVault
    )]
    pub subscriber_vault_ata: InterfaceAccount<'info, TokenAccount>,
    pub service_provider: SystemAccount<'info>,
    #[account(
        seeds = [SEED_PREFIX, SERVICE_SEED, service_provider.key().as_ref(), &_service_id.to_le_bytes()],
        bump = service.bump,
        constraint = service.is_active @ Error::InactiveService
    )]
    pub service: Account<'info, Service>,
    #[account()]
    pub token_mint: InterfaceAccount<'info, Mint>,
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
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>
}

impl<'info> SubscribeToken<'info> {
    pub fn perform_subscribe(ctx: Context<Self>, _service_id: u64, plan_id: u64) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let subscription = &mut ctx.accounts.subscription;
        let plan = service.get_plan(plan_id).unwrap();
        if !plan.is_active {
            return err!(Error::InactivePlan);
        }
        if plan.recipient.key() != ctx.accounts.recipient.key() {
            return err!(Error::RecipientMismatch);
        }
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
        subscription.plan_id = plan.id;
        subscription.is_active = true;
        subscription.service_key = service.key();
        subscription.owner = ctx.accounts.subscriber.key();
        subscription.last_charge_ts = Clock::get().unwrap().unix_timestamp as u64;
        subscription.next_charge_ts = subscription.last_charge_ts + plan.interval;
        subscription.bump = ctx.bumps.subscription;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(_service_id: u64)]
pub struct UnSubscribe<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut)]
    pub subscriber: Signer<'info>,
    pub service_provider: SystemAccount<'info>,
    #[account(
        seeds = [SEED_PREFIX, SERVICE_SEED, service_provider.key().as_ref(), &_service_id.to_le_bytes()],
        bump = service.bump
    )]
    pub service: Account<'info, Service>,
    #[account(
        mut,
        seeds = [SEED_PREFIX, SUBSCRIPTION_SEED, subscriber.key().as_ref(), service.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>
}

impl<'info> UnSubscribe<'info> {
    pub fn perform_unsubscribe(ctx: Context<Self>, _service_id: u64) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        subscription.is_active = false;
        Ok(())
    }
}