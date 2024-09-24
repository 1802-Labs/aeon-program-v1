mod states;
mod instructions;
mod errors;
mod utils;

use instructions::*;
use anchor_lang::prelude::*;

declare_id!("EvLqTE2QVj5TLTz6257ApiUxfu4tc7GHNDYCgN4hQv2c");

#[program]
pub mod aeon_program {
    use super::*;

    pub fn vault_create(ctx: Context<VaultCreate>, init_balance: u64) -> Result<()> {
        VaultCreate::perform_create(ctx, init_balance)
    }

    pub fn vault_withdraw_sol(ctx: Context<VaultWithdrawSOL>, amount: u64) -> Result<()> {
        VaultWithdrawSOL::perform_withdraw(ctx, amount)
    }

    pub fn vault_withdraw_token(ctx: Context<VaultWithdrawToken>, amount: u64) -> Result<()> {
        VaultWithdrawToken::perform_withdraw(ctx, amount)
    }

    pub fn service_create(ctx: Context<ServiceCreate>, id: u64, plan_infos: Vec<PlanInfo>) -> Result<()> {
        ServiceCreate::perform_create(ctx, id, plan_infos)
    }

    pub fn service_status_update(ctx: Context<ServiceStatusUpdate>, id: u64, is_active: bool) -> Result<()> {
        ServiceStatusUpdate::perform_update(ctx, id, is_active)
    }

    pub fn plan_status_update(ctx: Context<PlanStatusUpdate>, service_id: u64, plan_id: u64, is_active: bool) -> Result<()> {
        PlanStatusUpdate::perform_update(ctx, service_id, plan_id, is_active)
    }

    pub fn plan_add(ctx: Context<PlanAdd>, service_id: u64, plan_info: PlanInfo) -> Result<()> {
        PlanAdd::perform_add(ctx, service_id, plan_info)
    }

    pub fn subscribe_sol(ctx: Context<SubscribeSOL>, service_id: u64, plan_id: u64) -> Result<()> {
        SubscribeSOL::perform_subscribe(ctx, service_id, plan_id)
    }

    pub fn subscribe_token(ctx: Context<SubscribeToken>, service_id: u64, plan_id: u64) -> Result<()> {
        SubscribeToken::perform_subscribe(ctx, service_id, plan_id)
    }

    pub fn charge_sol(ctx: Context<ChargeSOL>, service_id: u64) -> Result<()> {
        ChargeSOL::perform_charge(ctx, service_id)
    }

    pub fn charge_token(ctx: Context<ChargeToken>, service_id: u64) -> Result<()> {
        ChargeToken::perform_charge(ctx, service_id)
    }

    pub fn unsubscribe(ctx: Context<UnSubscribe>, service_id: u64) -> Result<()> {
        UnSubscribe::perform_unsubscribe(ctx, service_id)
    }
}
