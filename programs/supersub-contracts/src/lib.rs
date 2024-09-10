mod states;
mod instructions;

use instructions::*;
use anchor_lang::prelude::*;

declare_id!("6LvWxo7kqwNFQzWAFqRJHkwLriPj6x5wnNNMvCm8GX9");

#[program]
pub mod supersub_contracts {
    use super::*;

    pub fn vault_create(ctx: Context<VaultCreate>, init_balance: u64) -> Result<()> {
        VaultCreate::vault_create(ctx, init_balance)
    }
}
