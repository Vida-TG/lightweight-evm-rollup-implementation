import { L2Transaction } from './types';

export class EVMExecutor {
    constructor(private stateManager: any) {}
    
    async execute(tx: L2Transaction): Promise<void> {
        // Implement EVM execution logic here
        // For now, just a placeholder
    }
} 