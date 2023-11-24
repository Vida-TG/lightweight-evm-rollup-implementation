import { ethers } from 'ethers';
import { RPCServer } from '../rpc/server';
import { Sequencer } from '../sequencer';
import { StateManager } from '../state';
import { BlockProducer } from '../blockProducer';
import { OptimisticProver } from '../proofs/optimisticProver';
import { FaucetServer } from '../faucet/faucetServer';
import { CONFIG } from '../config';

export class TestEnvironment {
    private l1Provider: ethers.Provider;
    private sequencer: Sequencer;
    private stateManager: StateManager;
    private blockProducer: BlockProducer;
    private rpcServer: RPCServer;
    private prover: OptimisticProver;
    private faucetServer: FaucetServer;

    constructor(config: any) {
        this.l1Provider = new ethers.JsonRpcProvider(config.L1_RPC_URL);
        this.stateManager = StateManager.getInstance();
        
        // Initialize block producer first
        this.blockProducer = new BlockProducer(this.stateManager, config.BLOCK_TIME);
        
        // Initialize sequencer with block producer
        this.sequencer = new Sequencer(
            config.L1_RPC_URL,
            config.L1_BRIDGE_ADDRESS,
            config.SEQUENCER_PRIVATE_KEY,
            this.blockProducer  // Pass block producer here
        );
        
        // Initialize RPC server with block producer
        this.rpcServer = new RPCServer(
            config.L2_RPC_PORT,
            this.sequencer,
            this.stateManager,
            this.blockProducer
        );
        
        // Initialize other services
        this.prover = new OptimisticProver(this.stateManager, this.l1Provider);
        this.faucetServer = new FaucetServer(config.FAUCET_PORT, this.stateManager);
    }

    async start() {
        console.log('Starting L2 testnet services...');
        
        try {
            // Clear any existing state
            this.stateManager.clearState();
            
            // Start block production
            await this.blockProducer.start();
            
            // Print initial state
            this.stateManager.debugPrintState();
            
            console.log('\nNetwork Information:');
            console.log(`Chain ID: ${CONFIG.CHAIN_ID}`);
            console.log(`RPC endpoint: http://localhost:${CONFIG.L2_RPC_PORT}`);
            console.log(`Faucet endpoint: http://localhost:${CONFIG.FAUCET_PORT}`);
            console.log(`Sequencer address: ${CONFIG.SEQUENCER_ADDRESS}`);
            console.log('\nUse the faucet to get testnet ETH: http://localhost:8546/faucet.html');
            console.log('\nL2 testnet is running!');
        } catch (error) {
            console.error('Failed to start L2 testnet:', error);
            throw error;
        }
    }

    private async deployContracts() {
        // Deploy L1 bridge and other contracts if needed
    }

    private async startServices() {
        // Initialize state
        const initialBalance = ethers.parseEther("1000000"); // 1M ETH for testing
        await this.stateManager.updateBalance(
            ethers.computeAddress(CONFIG.SEQUENCER_PRIVATE_KEY),
            initialBalance
        );
    }
} 