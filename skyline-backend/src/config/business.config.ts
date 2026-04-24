// SKYLINE Transfers Business Constants
// These values align with the business requirements

export const BUSINESS_CONFIG = {
    // Exchange Rate Configuration (Fixed as per requirement)
    // 1 RUB = 18.4 RWF (Russia to Rwanda)
    // 1 RWF = 0.054 RUB (Rwanda to Russia)
    FIXED_RUB_TO_RWF: 18.4,
    FIXED_RWF_TO_RUB: 0.054,
    
    // Fee Structure
    COMMISSION_RUB: 0,           // No commission per transfer
    MINIMUM_TRANSFER_RUB: 100,     // Minimum transfer amount
    MAXIMUM_TRANSFER_RUB: 500000,  // Maximum single transfer
    MINIMUM_TRANSFER_RWF: 1000,    // Minimum for reverse transfer

    // Processing Times
    STANDARD_PROCESSING_HOURS: 3,  
    RW_TO_RU_PROCESSING_MINUTES: 2, // MTN MoMo is faster

    // Business Model Settings
    INVENTORY_MODEL: true,         // Use Rwanda inventory for fast payments
    RUSSIAN_BANK_DOMESTIC: true,   // Use domestic Russian banking only
    PRIMARY_NETWORK: "MTN",        
    SUPPORTED_NETWORKS: ["MTN", "AIRTEL"],

    // Compliance Settings
    KYC_REQUIRED: true,            
    DAILY_LIMIT_RUB: 100000,     
    MONTHLY_LIMIT_RUB: 1000000,
};