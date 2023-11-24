import { ethers } from 'ethers';
import { StateManager } from './state';
import { EventEmitter } from 'events';
import { L2Transaction } from './types';

interface Block {
    number: number;
    hash: string;
    parentHash: string;
    timestamp: number;
    transactions: L2Transaction[];
    stateRoot: string;
}

interface TransactionReceipt {
    transactionHash: string;
    blockHash: string;
    blockNumber: number;
    from: string;
    to: string;
    status: number;  // 1 for success, 0 for failure
    gasUsed: bigint;
}

export class BlockProducer extends EventEmitter {
    private currentBlock: Block;
    private blocks: Map<string, Block> = new Map();
    private blockInterval!: NodeJS.Timeout;
    private blockNumber: number = 0;
    private transactionReceipts: Map<string, TransactionReceipt> = new Map();
    private pendingTransactions: L2Transaction[] = [];
    private transactions: Map<string, L2Transaction> = new Map();

    constructor(
        private stateManager: StateManager,
        private blockTime: number = 2000 // 2 seconds
    ) {
        super();
        this.currentBlock = this.createGenesisBlock();
        this.blocks.set(this.currentBlock.hash, this.currentBlock);
    }

    private createGenesisBlock(): Block {
        const block = {
            number: 0,
            hash: ethers.keccak256('0x'),
            parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
            timestamp: Math.floor(Date.now() / 1000),
            transactions: [],
            stateRoot: this.stateManager.getStateRoot()
        };
        this.blocks.set(block.hash, block);
        return block;
    }

    async start() {
        this.startBlockProduction();
        console.log('Block production started');
        return new Promise<void>(resolve => setTimeout(resolve, 1000));
    }

    getLatestBlock(): Block {
        return this.currentBlock;
    }

    getBlockByNumber(number: number): Block | null {
        for (const block of this.blocks.values()) {
            if (block.number === number) return block;
        }
        return null;
    }

    getBlockByHash(hash: string): Block | null {
        return this.blocks.get(hash) || null;
    }

    private startBlockProduction() {
        this.blockInterval = setInterval(() => {
            this.produceBlock();
        }, this.blockTime);
    }

    private async produceBlock() {
        this.blockNumber++;
        const newBlock: Block = {
            number: this.blockNumber,
            hash: '',
            parentHash: this.currentBlock.hash,
            timestamp: Math.floor(Date.now() / 1000),
            transactions: [...this.pendingTransactions], // Include pending transactions
            stateRoot: this.stateManager.getStateRoot()
        };

        // Clear pending transactions
        this.pendingTransactions = [];

        newBlock.hash = this.calculateBlockHash(newBlock);
        this.blocks.set(newBlock.hash, newBlock);
        this.currentBlock = newBlock;


        this.emit('newBlock', newBlock);
        console.log(`Produced block ${newBlock.number}, hash: ${newBlock.hash}`);
    }

    private calculateBlockHash(block: Block): string {
        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
            ['uint256', 'bytes32', 'uint256', 'bytes32'],
            [block.number, block.parentHash, block.timestamp, block.stateRoot]
        );
        return ethers.keccak256(encoded);
    }

    addPendingTransaction(tx: L2Transaction) {
        this.pendingTransactions.push(tx);
    }

    addTransactionReceipt(tx: L2Transaction, blockHash: string, blockNumber: number) {
        const txHash = this.generateTransactionHash(tx);
        const receipt: TransactionReceipt = {
            transactionHash: txHash,
            blockHash,
            blockNumber,
            from: tx.from,
            to: tx.to,
            status: 1,
            gasUsed: tx.gasLimit
        };
        this.transactionReceipts.set(txHash, receipt);
        this.transactions.set(txHash, tx);
        this.addPendingTransaction(tx);
        return receipt;
    }

    getTransactionReceipt(txHash: string): TransactionReceipt | null {
        return this.transactionReceipts.get(txHash) || null;
    }

    getTransactionByHash(hash: string): L2Transaction | null {
        return this.transactions.get(hash) || null;
    }

    private generateTransactionHash(tx: L2Transaction): string {
        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'uint256', 'bytes', 'uint256'],
            [tx.from, tx.to, tx.value, tx.data, tx.nonce]
        );
        return ethers.keccak256(encoded);
    }
} 