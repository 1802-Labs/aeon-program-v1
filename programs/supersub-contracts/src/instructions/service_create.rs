use anchor_lang::prelude::*;

use crate::states::{
    vault::Vault, 
    seeds::{SEED_PREFIX, VAULT_SEED, SERVICE_SEED}, 
    service::{Service, Plan}
};
use crate::errors::Error;

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct PlanInfo {
    pub charge_amount: u64,
    pub token_mint: Pubkey,
    // Should be a normal account/owner_vault
    // if the mint is WSOL else, it should be a
    // token account
    pub recipient: Pubkey
}

#[derive(Accounts)]
#[instruction(id: u64, plan_infos: Vec<PlanInfo>)]
pub struct ServiceCreate<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PREFIX, VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = fee_payer,
        space = 8 + Service::size(plan_infos.len()),
        seeds = [SEED_PREFIX, SERVICE_SEED, owner.key().as_ref(), &id.to_be_bytes()],
        bump
    )]
    pub service: Account<'info, Service>,
    pub system_program: Program<'info, System>
}

impl<'info> ServiceCreate<'info> {
    pub fn perform_create(ctx: Context<Self>, id: u64, plan_infos: Vec<PlanInfo>) -> Result<()> {
        if plan_infos.len() == 0 {
            return err!(Error::InvalidArgument)
        }
        let mut plans: Vec<Plan> = Vec::with_capacity(plan_infos.len());
        let current_id: u64 = 1;
        for info in plan_infos {
            let plan = Plan {
                id: current_id,
                charge_amount: info.charge_amount,
                created_at: Clock::get()?.unix_timestamp as u64,
                token_mint: info.token_mint,
                recipient: info.recipient,
                is_active: true
            };
            plans.push(plan);
        }
        let service = Service {
            id,
            created_at: Clock::get()?.unix_timestamp as u64,
            created_by: ctx.accounts.owner.key(),
            is_active: true,
            bump: ctx.bumps.service,
            plans
        };
        ctx.accounts.service.set_inner(service);
        Ok(())
    }
}