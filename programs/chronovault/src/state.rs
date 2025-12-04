use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub protocol_fee_bps: u16,
    pub keeper_fee_bps: u16,
    pub total_payments_created: u64,
    pub total_payments_executed: u64,
    pub total_fees_collected: u64,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ScheduledPayment {
    pub id: u64,
    pub owner: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub escrow: Pubkey,
    pub amount: u64,
    pub fee_amount: u64,
    pub execute_at_slot: u64,
    pub created_at_slot: u64,
    pub executed: bool,
    pub cancelled: bool,
    pub executor: Pubkey,
    pub executed_at_slot: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct KeeperStats {
    pub keeper: Pubkey,
    pub executions_count: u64,
    pub total_fees_earned: u64,
    pub failed_attempts: u64,
    pub registered_at_slot: u64,
    pub last_execution_slot: u64,
    pub bump: u8,
}

impl ProtocolConfig {
    pub const SEED_PREFIX: &'static [u8] = b"protocol_config";
    
    pub fn calculate_fees(&self, amount: u64) -> Option<(u64, u64, u64)> {
        let total_fee = amount
            .checked_mul(self.protocol_fee_bps as u64)?
            .checked_div(10000)?;
        
        let keeper_fee = total_fee
            .checked_mul(self.keeper_fee_bps as u64)?
            .checked_div(100)?;
        
        let protocol_fee = total_fee.checked_sub(keeper_fee)?;
        
        Some((total_fee, keeper_fee, protocol_fee))
    }
}

impl ScheduledPayment {
    pub const SEED_PREFIX: &'static [u8] = b"payment";
    
    pub fn is_executable(&self, current_slot: u64) -> bool {
        !self.executed && !self.cancelled && current_slot >= self.execute_at_slot
    }
    
    pub fn can_cancel(&self, caller: &Pubkey) -> bool {
        !self.executed && !self.cancelled && *caller == self.owner
    }
}

impl KeeperStats {
    pub const SEED_PREFIX: &'static [u8] = b"keeper_stats";
}
