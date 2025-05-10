use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, mint_to};

declare_id!("Fg6PaFpoGXkYsidMpWxTWqoz1Rz4hG98bXok8eXEiN7z");

#[program]
pub mod asset_module {
    use super::*;
    pub fn mint_item(ctx: Context<MintItem>, _bump: u8) -> Result<()> {
        let mint_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            }
        );
        mint_to(mint_ctx, 1)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct MintItem<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
