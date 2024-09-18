use anchor_lang::prelude::*;

#[account]
pub struct Subscription {
    pub service_key: Pubkey,
    pub owner: Pubkey,
    // pub subscriber_vault: Vault,
    // pub vault_ata: Option<Pubkey>,
    pub plan_id: u64,
    pub last_charge_ts: u64,
    pub is_active: bool,
    pub bump: u8
}

impl Subscription {
    pub const INIT_SPACE: usize = 
        32 + // service_key
        32 + // owner
        // Vault::INIT_SPACE + // subscriber_vault
        // 33 + // option + Pubkey
        8 + // plan_id
        8 + // last_charge_ts
        1 + // is_active
        1; // bump
}