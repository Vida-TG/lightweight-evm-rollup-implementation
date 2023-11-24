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