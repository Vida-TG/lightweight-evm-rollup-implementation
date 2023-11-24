import { ethers } from 'ethers';

export const CONFIG = {
    // Network Configuration
    CHAIN_ID: 1337,
    NETWORK_NAME: 'L2 Testnet',
    
    // RPC Configuration
    L1_RPC_URL: "",
    L2_RPC_PORT: 8545,
    
    // Contract Addresses
    L1_BRIDGE_ADDRESS: "0xc69d0BC2A925dD8EaaFEC0DA68917Df00b79982C",
    L2_BRIDGE_ADDRESS: "0x491903aA55c713e4c109B63Ad745602ff6454261",
    
    // Sequencer Configuration
    SEQUENCER_PRIVATE_KEY: "0x0d41decd22768d78b9b1c0522d6db2bc1a237605e4bec7afb8b307560a10b820",
    SEQUENCER_ADDRESS: "0xc676C84C6eAAEE52e7953B710bacC401a3B820c9", // Derived from private key
    
    // Batch Configuration
    BATCH_SIZE: 100,
    MIN_BATCH_TIMEOUT: 60000, // 1 minute
    BLOCK_TIME: 2000, // 2 seconds
    CHALLENGE_PERIOD: 604800, // 7 days in seconds
    
    // Faucet Configuration
    FAUCET_PORT: 8546,
    FAUCET_AMOUNT: ethers.parseEther("1.0"),
    FAUCET_COOLDOWN: 24, //* 60 * 60 * 1000, // 24 hours
    
    // Initial State Configuration
}; 