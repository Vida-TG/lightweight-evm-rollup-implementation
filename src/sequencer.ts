import { ethers } from 'ethers';
import { StateManager } from './state';
import { L2Transaction } from './types';
import { BlockProducer } from './blockProducer';

export class Sequencer {
    private l1Provider: ethers.Provider;
    private wallet: ethers.Wallet;
    private stateManager: StateManager;
    private pendingTransactions: L2Transaction[] = [];
    private currentNonce = 0;
    private blockProducer: BlockProducer;

    constructor(
        l1RpcUrl: string,
        private l1BridgeAddress: string,
        privateKey: string,
        blockProducer: BlockProducer
    ) {
        this.l1Provider = new ethers.JsonRpcProvider(l1RpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.l1Provider);
        this.stateManager = StateManager.getInstance(); // Use singleton instead of new instance
        this.blockProducer = blockProducer;
    }

    async addTransaction(tx: L2Transaction): Promise<string> {
        // Validate transaction
        if (!this.validateTransaction(tx)) {
            throw new Error('Invalid transaction');
        }

        try {
            // Process transaction
            await this.stateManager.applyTransaction(tx);
            
            // Generate transaction hash
            const txHash = this.generateTransactionHash(tx);
            
            // Add receipt and pending transaction
            const latestBlock = this.blockProducer.getLatestBlock();
            this.blockProducer.addTransactionReceipt(tx, latestBlock.hash, latestBlock.number);


            return txHash;
        } catch (error) {
            console.error('Transaction failed in sequencer:', error);
            throw error;
        }
    }

    private validateTransaction(tx: L2Transaction): boolean {
        // Check if sender has enough balance for value + gas
        const senderBalance = this.stateManager.getBalance(tx.from);
        const totalCost = tx.value + (tx.gasLimit * tx.gasPrice);
        
        if (senderBalance < totalCost) {
            throw new Error(`Insufficient balance. Address ${tx.from} has ${senderBalance.toString()} but needs ${totalCost.toString()}`);
        }

        // Check nonce with more detailed error message
        const expectedNonce = this.stateManager.getNextNonce(tx.from);
        if (tx.nonce !== expectedNonce) {
            throw new Error(
                `Invalid nonce. Got ${tx.nonce} but expected ${expectedNonce}. ` +
                `Current account state: { nonce: ${expectedNonce}, ` +
                `balance: ${senderBalance.toString()} }`
            );
        }

        return true;
    }

    private generateTransactionHash(tx: L2Transaction): string {
        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'uint256', 'bytes', 'uint256'],
            [tx.from, tx.to, tx.value, tx.data, tx.nonce]
        );
        return ethers.keccak256(encoded);
    }
} 