export interface L2Transaction {
    from: string;
    to: string;
    value: bigint;
    data: string;
    nonce: number;
    gasLimit: bigint;
    gasPrice: bigint;
    signature?: string;
}

export interface Block {
    number: number;
    hash: string;
    parentHash: string;
    timestamp: number;
    transactions: L2Transaction[];
    stateRoot: string;
} 