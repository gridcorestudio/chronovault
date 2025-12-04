use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{ProtocolConfig, ScheduledPayment};
use crate::errors::ChronoVaultError;

#[derive(Accounts)]
#[instruction(payment_id: u64)]
pub struct CreateScheduledPayment<'info> {
    #[account(
        seeds = [ProtocolConfig::SEED_PREFIX],
        bump = config.bump,
        constraint = !config.paused @ ChronoVaultError::ProtocolPaused
    )]
    pub config: Account<'info, ProtocolConfig>,
    
    #[account(
        init,
        payer = owner,
        space = 8 + ScheduledPayment::INIT_SPACE,
        seeds = [
            ScheduledPayment::SEED_PREFIX,
            owner.key().as_ref(),
            payment_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub payment: Account<'info, ScheduledPayment>,
    
    #[account(
        init,
        payer = owner,
        token::mint = mint,
        token::authority = payment,
        seeds = [b"escrow", payment.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// CHECK: Recipient wallet address
    pub recipient: UncheckedAccount<'info>,
    
    pub mint: Account<'info, anchor_spl::token::Mint>,
    
    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == mint.key()
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateScheduledPayment>,
    payment_id: u64,
    amount: u64,
    execute_at_slot: u64,
) -> Result<()> {
    require!(amount > 0, ChronoVaultError::InvalidAmount);
    
    let current_slot = Clock::get()?.slot;
    require!(
        execute_at_slot > current_slot,
        ChronoVaultError::InvalidExecutionSlot
    );
    
    let (total_fee, _, _) = ctx.accounts.config.calculate_fees(amount)
        .ok_or(ChronoVaultError::ArithmeticOverflow)?;
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.owner_token_account.to_account_info(),
        to: ctx.accounts.escrow.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;
    
    let payment = &mut ctx.accounts.payment;
    payment.id = payment_id;
    payment.owner = ctx.accounts.owner.key();
    payment.recipient = ctx.accounts.recipient.key();
    payment.mint = ctx.accounts.mint.key();
    payment.escrow = ctx.accounts.escrow.key();
    payment.amount = amount;
    payment.fee_amount = total_fee;
    payment.execute_at_slot = execute_at_slot;
    payment.created_at_slot = current_slot;
    payment.executed = false;
    payment.cancelled = false;
    payment.executor = Pubkey::default();
    payment.executed_at_slot = 0;
    payment.bump = ctx.bumps.payment;
    
    msg!("Scheduled payment created");
    msg!("Payment ID: {}", payment.id);
    msg!("Amount: {}", payment.amount);
    msg!("Execute at slot: {}", payment.execute_at_slot);
    msg!("Current slot: {}", current_slot);
    msg!("Slots until execution: {}", execute_at_slot - current_slot);
    
    Ok(())
}
