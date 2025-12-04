use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("ChronoVau1txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod chronovault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, protocol_fee_bps: u16, keeper_fee_bps: u16) -> Result<()> {
        instructions::initialize::handler(ctx, protocol_fee_bps, keeper_fee_bps)
    }

    pub fn create_scheduled_payment(
        ctx: Context<CreateScheduledPayment>,
        payment_id: u64,
        amount: u64,
        execute_at_slot: u64,
    ) -> Result<()> {
        instructions::create_payment::handler(ctx, payment_id, amount, execute_at_slot)
    }

    pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
        instructions::execute_payment::handler(ctx)
    }

    pub fn cancel_payment(ctx: Context<CancelPayment>) -> Result<()> {
        instructions::cancel_payment::handler(ctx)
    }

    pub fn update_protocol_config(
        ctx: Context<UpdateProtocolConfig>,
        new_protocol_fee_bps: Option<u16>,
        new_keeper_fee_bps: Option<u16>,
        paused: Option<bool>,
    ) -> Result<()> {
        instructions::update_config::handler(ctx, new_protocol_fee_bps, new_keeper_fee_bps, paused)
    }

    pub fn register_keeper(ctx: Context<RegisterKeeper>) -> Result<()> {
        instructions::register_keeper::handler(ctx)
    }
}
