use anchor_lang::prelude::*;

declare_id!("St4teModu13D3mo1111111111111111111111111111111111");

#[program]
pub mod state_module {
    use super::*;
    pub fn register_player(ctx: Context<RegisterPlayer>, name: String) -> Result<()> {
        let player = &mut ctx.accounts.player;
        player.owner = ctx.accounts.authority.key();
        player.name = name;
        player.level = 1;
        Ok(())
    }

    pub fn update_level(ctx: Context<UpdateLevel>, new_level: u8) -> Result<()> {
        ctx.accounts.player.level = new_level;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct RegisterPlayer<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 32 + 1)]
    pub player: Account<'info, PlayerState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateLevel<'info> {
    #[account(mut, has_one = owner)]
    pub player: Account<'info, PlayerState>,
    pub owner: Signer<'info>,
}

#[account]
pub struct PlayerState {
    pub owner: Pubkey,
    pub name: String,
    pub level: u8,
}
