use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};
use crate::state::{ProtocolConfig, ScheduledPayment};
use crate::errors::ChronoVaultError;


#[derive(Accounts)]
pub struct CancelPayment<'info> {
    #[account(
        mut,
        seeds = [ProtocolConfig::SEED_PREFIX],
        bump = config.bump
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
        constraint = !payment.cancelled @ ChronoVaultError::AlreadyCancelled,
        constraint = payment.owner == owner.key() @ ChronoVaultError::Unauthorized
    )]
    pub payment: Account<'info, ScheduledPayment>,
    
    #[account(
        mut,
        seeds = [b"escrow", payment.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == payment.mint
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = treasury_token_account.owner == config.treasury,
        constraint = treasury_token_account.mint == payment.mint
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelPayment>) -> Result<()> {
    let payment = &ctx.accounts.payment;
    
    let cancellation_penalty_bps: u64 = 10;
    let penalty = payment.amount
        .checked_mul(cancellation_penalty_bps)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?;
    
    let refund_amount = payment.amount
        .checked_sub(penalty)
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
    
    let transfer_refund = Transfer {
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.owner_token_account.to_account_info(),
        authority: ctx.accounts.payment.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_refund,
            signer_seeds,
        ),
        refund_amount,
    )?;
    
    if penalty > 0 {
        let transfer_penalty = Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.payment.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_penalty,
                signer_seeds,
            ),
            penalty,
        )?;
    }
    
    let close_escrow = CloseAccount {
        account: ctx.accounts.escrow.to_account_info(),
        destination: ctx.accounts.owner.to_account_info(),
        authority: ctx.accounts.payment.to_account_info(),
    };
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        close_escrow,
        signer_seeds,
    ))?;
    
    let payment = &mut ctx.accounts.payment;
    payment.cancelled = true;
    
    msg!("Payment cancelled successfully");
    msg!("Payment ID: {}", payment.id);
    msg!("Refund amount: {}", refund_amount);
    msg!("Cancellation penalty: {}", penalty);
    
    Ok(())
}
