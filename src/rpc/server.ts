import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { Sequencer } from '../sequencer';
import { StateManager } from '../state';
import { L2Transaction, Block } from '../types';
import { CONFIG } from '../config';
import { BlockProducer } from '../blockProducer';

export class RPCServer {
    private app: express.Express;
    private sequencer: Sequencer;
    private stateManager: StateManager;
    private blockProducer: BlockProducer;

    constructor(
        port: number,
        sequencer: Sequencer,
        stateManager: StateManager,
        blockProducer: BlockProducer
    ) {
        this.app = express();
        this.app.use(cors());
        this.sequencer = sequencer;
        this.stateManager = StateManager.getInstance();
        this.blockProducer = blockProducer;
        this.app.use(express.json());
        this.setupRoutes();
        this.app.listen(port, () => {
            console.log(`L2 RPC server listening on port ${port}`);
        });
    }

    private setupRoutes() {
        this.app.post('/', async (req, res) => {
            const { method, params, id } = req.body;
            
            try {
                const result = await this.handleRPCCall(method, params);
                res.json({
                    jsonrpc: '2.0',
                    id,
                    result
                });
            } catch (err) {
                const error = err as Error;
                res.json({
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32000,
                        message: error.message || 'Unknown error'
                    }
                });
            }
        });
    }

    private async handleRPCCall(method: string, params: any[]) {
        console.log('RPC call:', method, params);
        try {
            switch (method) {
                case 'web3_clientVersion':
                    return 'L2Testnet/v0.1';

                case 'eth_chainId':
                    return '0x' + CONFIG.CHAIN_ID.toString(16);
                
                case 'net_version':
                    return CONFIG.CHAIN_ID.toString();

                case 'net_listening':
                    return true;

                case 'eth_syncing':
                    return false;

                case 'eth_accounts':
                    return [];

                case 'eth_blockNumber':
                    const latestBlock = this.blockProducer.getLatestBlock();
                    return '0x' + latestBlock.number.toString(16);

                case 'eth_getBlockByHash':
                    const [blockHash, fullTx] = params;
                    const blockByHash = this.blockProducer.getBlockByHash(blockHash);
                    
                    if (!blockByHash) return null;
                    
                    return this.formatBlock(blockByHash, fullTx);

                case 'eth_getBlockByNumber':
                    const [blockNumberParam, fullTxs] = params;
                    const blockNumber = blockNumberParam === 'latest' 
                        ? this.blockProducer.getLatestBlock().number 
                        : parseInt(blockNumberParam, 16);
                    const block = this.blockProducer.getBlockByNumber(blockNumber);
                    
                    if (!block) return null;
                    
                    return this.formatBlock(block, fullTxs);

                case 'eth_getBalance':
                    const [address] = params;
                    if (!address) throw new Error('Address parameter required');
                    const normalizedAddress = address.toLowerCase();
                    const balance = this.stateManager.getBalance(normalizedAddress);
                    return '0x' + balance.toString(16).padStart(64, '0');
                
                case 'eth_call':
                    return '0x';

                case 'eth_estimateGas':
                    return '0x5208'; // 21000 gas

                case 'eth_gasPrice':
                    return '0x' + (1_000_000_000n).toString(16); // 1 gwei

                case 'eth_getTransactionCount':
                    const [countAddress, blockParam] = params;
                    const normalizedCountAddress = countAddress.toLowerCase();
                    // Force MetaMask to reset its nonce tracking
                    if (blockParam === 'pending') {
                        const pendingNonce = this.stateManager.getNextNonce(normalizedCountAddress);
                        console.log(`Getting pending nonce for ${normalizedCountAddress}: ${pendingNonce}`);
                        return '0x' + pendingNonce.toString(16);
                    } else {
                        const confirmedNonce = this.stateManager.getNextNonce(normalizedCountAddress);
                        console.log(`Getting confirmed nonce for ${normalizedCountAddress}: ${confirmedNonce}`);
                        return '0x' + confirmedNonce.toString(16);
                    }

                case 'eth_sendRawTransaction':
                    try {
                        const ethTx = ethers.Transaction.from(params[0]);
                        console.log('Processing transaction:', {
                            from: ethTx.from,
                            to: ethTx.to,
                            value: ethTx.value.toString(),
                            nonce: ethTx.nonce.toString()
                        });

                        const l2tx: L2Transaction = {
                            from: ethTx.from!,
                            to: ethTx.to!,
                            value: ethTx.value,
                            data: ethTx.data,
                            nonce: Number(ethTx.nonce),
                            gasLimit: ethTx.gasLimit,
                            gasPrice: ethTx.gasPrice || 0n,
                            signature: ethTx.signature?.serialized || '0x'
                        };

                        // This will throw if validation fails
                        const txHash = await this.sequencer.addTransaction(l2tx);
                        console.log('Transaction processed successfully:', txHash);
                        return txHash;
                    } catch (error) {
                        console.error('Transaction failed:', error);
                        throw new Error(`Transaction failed: ${(error as Error).message}`);
                    }

                case 'eth_getCode':
                    const [codeAddress] = params;
                    const code = this.stateManager.getCode(codeAddress.toLowerCase());
                    return code || '0x';
                
                case 'eth_getTransactionReceipt':
                    const [txHash] = params;
                    const receipt = this.blockProducer.getTransactionReceipt(txHash);
                    if (!receipt) return null;
                    
                    return {
                        transactionHash: receipt.transactionHash,
                        blockHash: receipt.blockHash,
                        blockNumber: '0x' + receipt.blockNumber.toString(16),
                        from: receipt.from,
                        to: receipt.to,
                        status: '0x' + receipt.status.toString(16),
                        gasUsed: '0x' + receipt.gasUsed.toString(16),
                        cumulativeGasUsed: '0x' + receipt.gasUsed.toString(16),
                        effectiveGasPrice: '0x' + (1_000_000_000n).toString(16),
                        contractAddress: null,
                        logs: [],
                        logsBloom: '0x' + '0'.repeat(512),
                        type: '0x0'
                    };

                case 'eth_getTransactionByHash':
                    const [transactionHash] = params;
                    const transaction = this.blockProducer.getTransactionByHash(transactionHash);
                    if (!transaction) return null;
                    
                    const txReceipt = this.blockProducer.getTransactionReceipt(transactionHash);
                    return {
                        ...this.formatTransaction(transaction),
                        blockHash: txReceipt?.blockHash || null,
                        blockNumber: txReceipt ? '0x' + txReceipt.blockNumber.toString(16) : null
                    };

                default:
                    console.warn(`Method ${method} not implemented`);
                    throw new Error(`Method ${method} not supported`);
            }
        } catch (error) {
            console.error(`Error handling RPC call ${method}:`, error);
            throw error;
        }
    }

    private async handleEthCall(txParams: any): Promise<string> {
        // Implement eth_call logic
        return '0x';
    }

    private generateTransactionHash(tx: L2Transaction): string {
        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'uint256', 'bytes', 'uint256'],
            [tx.from, tx.to, tx.value, tx.data, tx.nonce]
        );
        return ethers.keccak256(encoded);
    }

    private formatBlock(block: Block, includeTransactions: boolean) {
        return {
            number: '0x' + block.number.toString(16),
            hash: block.hash,
            parentHash: block.parentHash,
            nonce: '0x0',
            sha3Uncles: '0x' + '0'.repeat(64),
            logsBloom: '0x' + '0'.repeat(512),
            transactionsRoot: '0x' + '0'.repeat(64),
            stateRoot: block.stateRoot,
            receiptsRoot: '0x' + '0'.repeat(64),
            miner: CONFIG.SEQUENCER_ADDRESS,
            difficulty: '0x0',
            totalDifficulty: '0x0',
            extraData: '0x',
            size: '0x0',
            gasLimit: '0x1000000',
            gasUsed: '0x0',
            timestamp: '0x' + block.timestamp.toString(16),
            transactions: includeTransactions 
                ? block.transactions.map((tx: L2Transaction) => this.formatTransaction(tx))
                : block.transactions.map((tx: L2Transaction) => this.generateTransactionHash(tx)),
            uncles: []
        };
    }

    private formatTransaction(tx: L2Transaction) {
        return {
            hash: this.generateTransactionHash(tx),
            nonce: '0x' + tx.nonce.toString(16),
            blockHash: null, // Will be filled in when mined
            blockNumber: null,
            transactionIndex: '0x0',
            from: tx.from,
            to: tx.to,
            value: '0x' + tx.value.toString(16),
            gas: '0x' + tx.gasLimit.toString(16),
            gasPrice: '0x' + tx.gasPrice.toString(16),
            input: tx.data,
            v: '0x0',
            r: '0x0',
            s: '0x0'
        };
    }
} 