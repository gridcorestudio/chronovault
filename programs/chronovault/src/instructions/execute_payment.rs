use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{ProtocolConfig, ScheduledPayment, KeeperStats};
use crate::errors::ChronoVaultError;

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    #[account(
        mut,
        seeds = [ProtocolConfig::SEED_PREFIX],
        bump = config.bump,
        constraint = !config.paused @ ChronoVaultError::ProtocolPaused
    )]
    pub config: Account<'info, ProtocolConfig>,
    
    #[account(
        mut,
        seeds = [
            ScheduledPayment::SEED_PREFIX,
            payment.owner.as_ref(),
            payment.id.to_le_bytes().as_ref()
        ],
        bump = payment.bump,
        constraint = !payment.executed @ ChronoVaultError::AlreadyExecuted,
        constraint = !payment.cancelled @ ChronoVaultError::AlreadyCancelled
    )]
    pub payment: Account<'info, ScheduledPayment>,
    
    #[account(
        mut,
        seeds = [b"escrow", payment.key().as_ref()],
        bump,
        constraint = escrow.amount >= payment.amount @ ChronoVaultError::InsufficientFunds
    )]
    pub escrow: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub keeper: Signer<'info>,
    
    #[account(
        mut,
        seeds = [KeeperStats::SEED_PREFIX, keeper.key().as_ref()],
        bump = keeper_stats.bump
    )]
    pub keeper_stats: Account<'info, KeeperStats>,
    
    #[account(
        mut,
        constraint = recipient_token_account.owner == payment.recipient,
        constraint = recipient_token_account.mint == payment.mint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = keeper_token_account.owner == keeper.key(),
        constraint = keeper_token_account.mint == payment.mint
    )]
    pub keeper_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = treasury_token_account.owner == config.treasury,
        constraint = treasury_token_account.mint == payment.mint
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ExecutePayment>) -> Result<()> {
    let current_slot = Clock::get()?.slot;
    let payment = &ctx.accounts.payment;
    
    require!(
        current_slot >= payment.execute_at_slot,
        ChronoVaultError::TooEarly
    );
    
    let (_, keeper_fee, protocol_fee) = ctx.accounts.config.calculate_fees(payment.amount)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?;
    let recipient_amount = payment.amount
        .checked_sub(keeper_fee)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?
        .checked_sub(protocol_fee)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?;
    
    let owner_key = ctx.accounts.payment.owner;
    let payment_id_bytes = ctx.accounts.payment.id.to_le_bytes();
    let payment_seeds = &[
        ScheduledPayment::SEED_PREFIX,
        owner_key.as_ref(),
        payment_id_bytes.as_ref(),
        &[ctx.accounts.payment.bump],
    ];
    let signer_seeds = &[&payment_seeds[..]];
    
    let transfer_to_recipient = Transfer {
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.payment.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_to_recipient,
            signer_seeds,
        ),
        recipient_amount,
    )?;
    
    let transfer_to_keeper = Transfer {
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.keeper_token_account.to_account_info(),
        authority: ctx.accounts.payment.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_to_keeper,
            signer_seeds,
        ),
        keeper_fee,
    )?;
    
    let transfer_to_treasury = Transfer {
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.treasury_token_account.to_account_info(),
        authority: ctx.accounts.payment.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_to_treasury,
            signer_seeds,
        ),
        protocol_fee,
    )?;
    
    let payment = &mut ctx.accounts.payment;
    payment.executed = true;
    payment.executor = ctx.accounts.keeper.key();
    payment.executed_at_slot = current_slot;
    
    let keeper_stats = &mut ctx.accounts.keeper_stats;
    keeper_stats.executions_count = keeper_stats.executions_count
        .checked_add(1)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?;
    keeper_stats.total_fees_earned = keeper_stats.total_fees_earned
        .checked_add(keeper_fee)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?;
    keeper_stats.last_execution_slot = current_slot;
    
    let config = &mut ctx.accounts.config;
    config.total_payments_executed = config.total_payments_executed
        .checked_add(1)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?;
    config.total_fees_collected = config.total_fees_collected
        .checked_add(protocol_fee)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?;
    
    msg!("Payment executed successfully");
    msg!("Payment ID: {}", payment.id);
    msg!("Recipient amount: {}", recipient_amount);
    msg!("Keeper fee: {}", keeper_fee);
    msg!("Protocol fee: {}", protocol_fee);
    msg!("Executor: {}", payment.executor);
    
    Ok(())
}
