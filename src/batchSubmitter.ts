import { ethers } from 'ethers';
import { encode } from 'rlp';
import { L2Transaction } from './types';

export class BatchSubmitter {
    private l1Bridge: ethers.Contract;
    
    constructor(
        l1BridgeAddress: string,
        private wallet: ethers.Wallet,
        private l1BridgeAbi: any
    ) {
        this.l1Bridge = new ethers.Contract(
            l1BridgeAddress,
            l1BridgeAbi,
            wallet
        );
    }

    async submitBatch(batch: L2Transaction[], stateRoot: string) {
        // Encode the batch data
        const encodedBatch = encode(batch.map(tx => this.encodeTx(tx)));
        
        // Calculate the state root (in production, this would be more complex)
        const batchStateRoot = ethers.keccak256(encodedBatch);
        
        // Submit the batch
        const tx = await this.l1Bridge.submitBatch(
            encodedBatch,
            batchStateRoot,
            {
                gasLimit: 2000000
            }
        );
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        // Emit event for monitoring
        console.log(`Batch submitted: ${receipt.transactionHash}`);
        
        return receipt;
    }

    private encodeTx(tx: L2Transaction): string[] {
        return [
            tx.from,
            tx.to,
            tx.value.toString(),
            tx.data,
            tx.nonce.toString()
        ];
    }
} 