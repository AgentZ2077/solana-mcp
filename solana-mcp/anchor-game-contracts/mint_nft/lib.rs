use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqoz1Rz4hG98bXok8eXEiN7z");

#[program]
pub mod mint_nft {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
