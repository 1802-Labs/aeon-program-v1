mod states;
mod instructions;
mod errors;

use instructions::*;
use anchor_lang::prelude::*;

declare_id!("6LvWxo7kqwNFQzWAFqRJHkwLriPj6x5wnNNMvCm8GX9");

#[program]
pub mod supersub_contracts {
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
}
