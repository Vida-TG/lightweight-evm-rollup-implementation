import { ethers } from 'ethers';
import { EVMExecutor } from './evm';
import { L2Transaction } from './types';
import { EventEmitter } from 'events';

interface AccountState {
    nonce: number;
    balance: bigint;
    code: string;
    storage: Map<string, string>;
}

export class StateManager extends EventEmitter {
    private static instance: StateManager;
    private accounts: Map<string, AccountState> = new Map();
    private evmExecutor: EVMExecutor;
    private pendingNonces: Map<string, number> = new Map();  // Track pending nonces

    private constructor() {
        super();
        this.evmExecutor = new EVMExecutor(this);
    }

    static getInstance(): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    async applyTransaction(tx: L2Transaction) {
        try {
            // First deduct gas costs and transfer value
            await this.updateBalance(tx.from, -(tx.value + tx.gasLimit * tx.gasPrice));
            await this.updateBalance(tx.to, tx.value);
            
            // Execute contract code if destination is a contract
            if (this.hasCode(tx.to)) {
                await this.evmExecutor.execute(tx);
            }
            
            // Update nonce AFTER successful transaction
            this.incrementNonce(tx.from);
            
            console.log(`Transaction applied successfully:`, {
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                nonce: tx.nonce,
                newFromBalance: this.getBalance(tx.from).toString(),
                newToBalance: this.getBalance(tx.to).toString(),
                newFromNonce: this.getNextNonce(tx.from)
            });
        } catch (error) {
            console.error('Failed to apply transaction:', error);
            throw error;
        }
    }

    getAccount(address: string): AccountState {
        const normalizedAddress = address.toLowerCase();
        let account = this.accounts.get(normalizedAddress);
        if (!account) {
            account = {
                nonce: 0,
                balance: BigInt(0),
                code: '',
                storage: new Map()
            };
            this.accounts.set(normalizedAddress, account);
        }
        return account;
    }

    getNonce(address: string): number {
        return this.getAccount(address).nonce;
    }

    hasCode(address: string): boolean {
        return this.getAccount(address).code.length > 0;
    }

    incrementNonce(address: string) {
        const normalizedAddress = address.toLowerCase();
        const account = this.getAccount(normalizedAddress);
        account.nonce++;
        this.accounts.set(normalizedAddress, account);
        // Update pending nonce
        this.pendingNonces.set(normalizedAddress, account.nonce);
        console.log(`Nonce incremented for ${normalizedAddress}: ${account.nonce}`);
    }

    async updateBalance(address: string, amount: bigint) {
        const normalizedAddress = address.toLowerCase();
        const account = this.getAccount(normalizedAddress);
        
        // If amount is negative (spending), check if there's enough balance
        if (amount < 0n && account.balance + amount < 0n) {
            throw new Error(`Insufficient balance. Address ${normalizedAddress} has ${account.balance.toString()} but tried to spend ${(-amount).toString()}`);
        }
        
        account.balance += amount;
        this.accounts.set(normalizedAddress, account);
        
        console.log(`Balance updated for ${normalizedAddress}:`, {
            address: normalizedAddress,
            oldBalance: (account.balance - amount).toString(),
            newBalance: account.balance.toString()
        });
        
        this.emit('balanceChanged', {
            address: normalizedAddress,
            newBalance: account.balance
        });
    }

    getBalance(address: string): bigint {
        const normalizedAddress = address.toLowerCase();
        const account = this.getAccount(normalizedAddress);
        console.log(`Getting balance for ${normalizedAddress}: ${account.balance.toString()}`);
        return account.balance;
    }

    getStateRoot(): string {
        // In a real implementation, this would compute a Merkle root of the state
        // For now, we'll create a simple hash of all account states
        const stateArray = Array.from(this.accounts.entries());
        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
            ['tuple(address, uint256, string, string)[]'],
            [stateArray.map(([addr, state]) => [
                addr,
                state.balance,
                state.code,
                JSON.stringify(Array.from(state.storage.entries()))
            ])]
        );
        return ethers.keccak256(encoded);
    }

    // Debug method to print all account states
    debugPrintState() {
        console.log('\nCurrent State:');
        for (const [address, account] of this.accounts.entries()) {
            console.log(`${address}:`, {
                balance: account.balance.toString(),
                nonce: account.nonce
            });
        }
        console.log();
    }

    clearState() {
        this.accounts.clear();
        this.pendingNonces.clear();  // Clear pending nonces too
        console.log('State cleared');
        this.emit('stateCleared');
        this.debugPrintState();
    }

    getNextNonce(address: string): number {
        const normalizedAddress = address.toLowerCase();
        const account = this.getAccount(normalizedAddress);
        const pendingNonce = this.pendingNonces.get(normalizedAddress) || account.nonce;
        console.log(`Getting next nonce for ${normalizedAddress}: ${pendingNonce}`);
        return pendingNonce;
    }

    getCode(address: string): string {
        const normalizedAddress = address.toLowerCase();
        return this.getAccount(normalizedAddress).code;
    }

    setCode(address: string, code: string) {
        const normalizedAddress = address.toLowerCase();
        const account = this.getAccount(normalizedAddress);
        account.code = code;
        this.accounts.set(normalizedAddress, account);
    }
} 