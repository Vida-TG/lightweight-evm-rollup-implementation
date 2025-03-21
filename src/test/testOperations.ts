import { ethers } from 'ethers';
import { CONFIG } from '../config';
import { L1_BRIDGE_ABI } from '../abi/contracts';

async function testOperations() {
    console.log('Testing L2 operations...');
    
    // Setup L1 connection
    const l1Provider = new ethers.JsonRpcProvider(CONFIG.L1_RPC_URL);
    const wallet = new ethers.Wallet(CONFIG.SEQUENCER_PRIVATE_KEY, l1Provider);
    const l1Bridge = new ethers.Contract(CONFIG.L1_BRIDGE_ADDRESS, L1_BRIDGE_ABI, wallet);

    // Setup L2 connection
    const l2Provider = new ethers.JsonRpcProvider(`http://localhost:${CONFIG.L2_RPC_PORT}`);
    
    try {
        // 1. Deposit to L2
        console.log('Making deposit to L2...');
        const depositTx = await l1Bridge.depositToL2({
            value: ethers.parseEther("0.1")
        });
        await depositTx.wait();
        console.log('Deposit successful:', depositTx.hash);

        // 2. Check L2 balance
        const balance = await l2Provider.getBalance(wallet.address);
        console.log('L2 balance:', ethers.formatEther(balance));

        // 3. Make L2 transaction
        const tx = {
            to: "0x1234567890123456789012345678901234567890",
            value: ethers.parseEther("0.01")
        };
        const l2Tx = await wallet.sendTransaction(tx);
        await l2Tx.wait();
        console.log('L2 transaction successful:', l2Tx.hash);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testOperations().catch(console.error); 