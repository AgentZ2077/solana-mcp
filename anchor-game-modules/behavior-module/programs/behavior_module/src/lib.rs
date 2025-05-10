use anchor_lang::prelude::*;

declare_id!("BehAv10rM0Du13D3m0111111111111111111111111111111");

#[program]
pub mod behavior_module {
    use super::*;
    pub fn attack(ctx: Context<Attack>, damage: u8) -> Result<()> {
        let player = &mut ctx.accounts.player;
        require!(player.hp > damage, CustomError::PlayerDefeated);
        player.hp -= damage;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Attack<'info> {
    #[account(mut, has_one = owner)]
    pub player: Account<'info, PlayerState>,
    pub owner: Signer<'info>,
}

#[account]
pub struct PlayerState {
    pub owner: Pubkey,
    pub hp: u8,
}

#[error_code]
pub enum CustomError {
    #[msg("Player would be defeated.")]
    PlayerDefeated,
}
