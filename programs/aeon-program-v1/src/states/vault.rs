use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub bump: u8
}

impl Vault {
    pub const INIT_SPACE: usize = 32 + 1;
}