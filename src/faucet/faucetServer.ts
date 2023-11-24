import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { StateManager } from '../state';

export class FaucetServer {
    private app: express.Express;
    private lastRequest: Map<string, number> = new Map();
    private cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours
    private faucetAmount = ethers.parseEther("1"); // 1 ETH

    constructor(
        private port: number,
        private stateManager: StateManager
    ) {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        this.stateManager = StateManager.getInstance(); // Use singleton
        this.setupRoutes();
    }

    private setupRoutes() {
        this.app.post('/faucet', async (req, res) => {
            try {
                const { address } = req.body;
                
                if (!ethers.isAddress(address)) {
                    return res.status(400).json({ error: 'Invalid address' });
                }

                // Check cooldown
                const lastRequestTime = this.lastRequest.get(address) || 0;
                const now = Date.now();
                if (now - lastRequestTime < this.cooldownPeriod) {
                    const remainingTime = Math.ceil((this.cooldownPeriod - (now - lastRequestTime)) / (1000 * 60 * 60));
                    return res.status(429).json({ 
                        error: `Please wait ${remainingTime} hours before requesting again`
                    });
                }

                // Get current balance
                const currentBalance = this.stateManager.getBalance(address);
                console.log(`Current balance for ${address}: ${currentBalance.toString()}`);

                // Send ETH
                await this.stateManager.updateBalance(address, this.faucetAmount);
                this.lastRequest.set(address, now);

                // Get new balance to confirm
                const newBalance = this.stateManager.getBalance(address);
                console.log(`New balance for ${address}: ${newBalance.toString()}`);

                res.json({ 
                    success: true, 
                    message: `Sent ${ethers.formatEther(this.faucetAmount)} ETH to ${address}`,
                    oldBalance: currentBalance.toString(),
                    newBalance: newBalance.toString()
                });
            } catch (error) {
                console.error('Faucet error:', error);
                res.status(500).json({ error: 'Faucet request failed' });
            }
        });

        this.app.listen(this.port, () => {
            console.log(`Faucet server listening on port ${this.port}`);
        });
    }
} 