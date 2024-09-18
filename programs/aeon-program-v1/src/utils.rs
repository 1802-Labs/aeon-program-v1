use anchor_lang::prelude::*;
use anchor_spl::token::{self, TransferChecked};

pub fn perform_token_transfer<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount: u64,
    decimals: u8,
    signer_seeds: &[&[&[u8]]]
) -> Result<()> {
    let accounts = TransferChecked {
        from,
        to,
        authority,
        mint
    };
    token::transfer_checked(
        CpiContext::new_with_signer(
            token_program ,
            accounts,
            signer_seeds
        ), 
        amount,
        decimals
    )
}
