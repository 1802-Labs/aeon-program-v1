use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Vault lamports cannot go below minimum rent")]
    VaultRentExemptError,
    #[msg("The specified vault token account is not owned by the owner vault")]
    ATANotOwnedByVault,
    #[msg("Invalid argument")]
    InvalidArgument
}