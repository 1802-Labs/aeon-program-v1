use anchor_lang::prelude::*;

use crate::states::{vault::Vault, seeds::{SEED_PREFIX, VAULT_SEED}};

#[derive(Accounts)]
pub struct VaultCreate<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = fee_payer,
        space = 8 + Vault::INIT_SPACE,
        seeds = [SEED_PREFIX, VAULT_SEED, owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>
}

impl<'info> VaultCreate<'info> {
    pub fn perform_create(ctx: Context<Self>, init_balance: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.set_inner(Vault {
            owner: ctx.accounts.owner.key(),
            bump: ctx.bumps.vault
        });
        if init_balance > 0 {
            let transfer_ix = solana_program::system_instruction::transfer(
                &ctx.accounts.owner.key(),
                &ctx.accounts.vault.key(),
                init_balance
            );
            solana_program::program::invoke_signed(
                &transfer_ix,
                &[
                    ctx.accounts.owner.to_account_info(),
                    ctx.accounts.vault.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[],
            )?;
        }
        Ok(())
    }
}