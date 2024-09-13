use anchor_lang::prelude::*;

#[derive(AnchorDeserialize, AnchorSerialize, InitSpace, PartialEq, Eq, Clone)]
pub struct Plan {
    pub id: u64,
    pub charge_amount: u64,
    pub created_at: u64,
    pub interval: u64,
    pub token_mint: Option<Pubkey>,
    pub recipient: Pubkey,
    pub is_active: bool
}

#[account]
pub struct Service {
    pub id: u64,
    pub created_at: u64,
    pub created_by: Pubkey,
    pub is_active: bool,
    pub bump: u8,
    pub plans: Vec<Plan>
}

impl Service {
    pub fn size(plan_count: usize) -> usize {
        8  + // id
        8  + // created_at
        32 + // created_by
        2  + // status and bump
        4  + // plans vector length
        (plan_count * (Plan::INIT_SPACE + 8)) // plans
    }
}