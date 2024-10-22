use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Vault lamports cannot go below minimum rent")]
    VaultRentExemptError,
    #[msg("The specified vault token account is not owned by the owner vault")]
    ATANotOwnedByVault,
    #[msg("Invalid argument")]
    InvalidArgument,
    #[msg("Plan not found")]
    PlanNotFound,
    #[msg("Service is not active")]
    InactiveService,
    #[msg("Plan is not active")]
    InactivePlan,
    #[msg("Subscription is not active")]
    InactiveSubscription,
    #[msg("Insufficient balance for subscription")]
    InsufficientVaultBalance,
    #[msg("Subscription recipient mismatch")]
    RecipientMismatch,
    #[msg("Next charge ts not reached")]
    NextChargeTsNotReached
}