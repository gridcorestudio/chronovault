use anchor_lang::prelude::*;

#[error_code]
pub enum ChronoVaultError {
    #[msg("Protocol is currently paused")]
    ProtocolPaused,
    
    #[msg("Invalid payment amount - must be greater than zero")]
    InvalidAmount,
    
    #[msg("Invalid execution slot - must be in the future")]
    InvalidExecutionSlot,
    
    #[msg("Payment already executed")]
    AlreadyExecuted,
    
    #[msg("Payment already cancelled")]
    AlreadyCancelled,
    
    #[msg("Cannot execute before target slot")]
    TooEarly,
    
    #[msg("Unauthorized - only owner can perform this action")]
    Unauthorized,
    
    #[msg("Invalid fee configuration")]
    InvalidFeeConfig,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Invalid mint - token not supported")]
    InvalidMint,
    
    #[msg("Insufficient funds in escrow")]
    InsufficientFunds,
    
    #[msg("Keeper already registered")]
    KeeperAlreadyRegistered,
    
    #[msg("Invalid authority")]
    InvalidAuthority,
    
    #[msg("Invalid treasury account")]
    InvalidTreasury,
}
