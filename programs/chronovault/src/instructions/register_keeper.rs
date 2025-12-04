use anchor_lang::prelude::*;
use crate::state::{ProtocolConfig, KeeperStats};
use crate::errors::ChronoVaultError;

#[derive(Accounts)]
pub struct RegisterKeeper<'info> {
    #[account(
        seeds = [ProtocolConfig::SEED_PREFIX],
        bump = config.bump,
        constraint = !config.paused @ ChronoVaultError::ProtocolPaused
    )]
    pub config: Account<'info, ProtocolConfig>,
    
    #[account(
        init,
        payer = keeper,
        space = 8 + KeeperStats::INIT_SPACE,
        seeds = [KeeperStats::SEED_PREFIX, keeper.key().as_ref()],
        bump
    )]
    pub keeper_stats: Account<'info, KeeperStats>,
    
    #[account(mut)]
    pub keeper: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterKeeper>) -> Result<()> {
    let current_slot = Clock::get()?.slot;
    
    let keeper_stats = &mut ctx.accounts.keeper_stats;
    keeper_stats.keeper = ctx.accounts.keeper.key();
    keeper_stats.executions_count = 0;
    keeper_stats.total_fees_earned = 0;
    keeper_stats.failed_attempts = 0;
    keeper_stats.registered_at_slot = current_slot;
    keeper_stats.last_execution_slot = 0;
    keeper_stats.bump = ctx.bumps.keeper_stats;
    
    msg!("Keeper registered successfully");
    msg!("Keeper: {}", keeper_stats.keeper);
    msg!("Registered at slot: {}", keeper_stats.registered_at_slot);
    
    Ok(())
}
