use anchor_lang::prelude::*;
use anchor_spl::{token::Token, token_interface::{Mint, TokenAccount}};

use crate::states::{vault::Vault, seeds::{SEED_PREFIX, VAULT_SEED}};
use crate::utils::*;
use crate::errors::Error;

#[derive(Accounts)]
pub struct VaultWithdrawSOL<'info> {
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
    #[account(mut)]
    pub destination: SystemAccount<'info>,
    pub system_program: Program<'info, System>
}

impl<'info> VaultWithdrawSOL<'info> {
    pub fn perform_withdraw(ctx: Context<Self>, amount: u64) -> Result<()> {
        let vault_rent = Rent::get()?.minimum_balance(Vault::INIT_SPACE + 8);
        if (ctx.accounts.vault.get_lamports() - amount) < vault_rent {
            return err!(Error::VaultRentExemptError);
        }
        ctx.accounts.vault.sub_lamports(amount)?;
        ctx.accounts.destination.add_lamports(amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct VaultWithdrawToken<'info> {
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
    #[account()]
    pub token_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        constraint = vault_ata.owner == vault.key() @ Error::ATANotOwnedByVault
    )]
    pub vault_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub destination_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>
}

impl<'info> VaultWithdrawToken<'info> {
    pub fn perform_withdraw(ctx: Context<Self>, amount: u64) -> Result<()> {
        let owner = ctx.accounts.owner.key();
        let signer_seeds: &[&[&[u8]]] = &[&[SEED_PREFIX, VAULT_SEED, owner.as_ref(), &[ctx.accounts.vault.bump]]];
        perform_token_transfer(
            ctx.accounts.vault_ata.to_account_info(), 
            ctx.accounts.destination_ata.to_account_info(), 
            ctx.accounts.vault.to_account_info(), 
            ctx.accounts.token_mint.to_account_info(), 
            ctx.accounts.token_program.to_account_info(), 
            amount, 
            ctx.accounts.token_mint.decimals, 
            signer_seeds
        )
    }
}