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