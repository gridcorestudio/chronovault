use anchor_lang::prelude::*;
use crate::state::ProtocolConfig;
use crate::errors::ChronoVaultError;

#[derive(Accounts)]
pub struct UpdateProtocolConfig<'info> {
    #[account(
        mut,
        seeds = [ProtocolConfig::SEED_PREFIX],
        bump = config.bump,
        constraint = config.authority == authority.key() @ ChronoVaultError::InvalidAuthority
    )]
    pub config: Account<'info, ProtocolConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateProtocolConfig>,
    new_protocol_fee_bps: Option<u16>,
    new_keeper_fee_bps: Option<u16>,
    paused: Option<bool>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    if let Some(fee_bps) = new_protocol_fee_bps {
        require!(fee_bps <= 1000, ChronoVaultError::InvalidFeeConfig);
        config.protocol_fee_bps = fee_bps;
        msg!("Protocol fee updated to {} bps", fee_bps);
    }
    
    if let Some(keeper_bps) = new_keeper_fee_bps {
        require!(keeper_bps <= 100, ChronoVaultError::InvalidFeeConfig);
        config.keeper_fee_bps = keeper_bps;
        msg!("Keeper fee share updated to {}%", keeper_bps);
    }
    
    if let Some(pause_state) = paused {
        config.paused = pause_state;
        if pause_state {
            msg!("Protocol PAUSED");
        } else {
            msg!("Protocol RESUMED");
        }
    }
    
    Ok(())
}
