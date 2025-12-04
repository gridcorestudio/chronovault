use anchor_lang::prelude::*;
use crate::state::ProtocolConfig;
use crate::errors::ChronoVaultError;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [ProtocolConfig::SEED_PREFIX],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Treasury account to receive protocol fees
    pub treasury: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    protocol_fee_bps: u16,
    keeper_fee_bps: u16,
) -> Result<()> {
    require!(
        protocol_fee_bps <= 1000 && keeper_fee_bps <= 100,
        ChronoVaultError::InvalidFeeConfig
    );
    
    let config = &mut ctx.accounts.config;
    
    config.authority = ctx.accounts.authority.key();
    config.treasury = ctx.accounts.treasury.key();
    config.protocol_fee_bps = protocol_fee_bps;
    config.keeper_fee_bps = keeper_fee_bps;
    config.total_payments_created = 0;
    config.total_payments_executed = 0;
    config.total_fees_collected = 0;
    config.paused = false;
    config.bump = ctx.bumps.config;
    
    msg!("ChronoVault protocol initialized");
    msg!("Authority: {}", config.authority);
    msg!("Treasury: {}", config.treasury);
    msg!("Protocol fee: {} bps", config.protocol_fee_bps);
    msg!("Keeper fee share: {}%", config.keeper_fee_bps);
    
    Ok(())
}
