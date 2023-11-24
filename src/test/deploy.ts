import { ethers } from 'ethers';
import { CONFIG } from '../config';
import { L1_BRIDGE_ABI } from '../abi/contracts';

async function testDeployment() {
    const provider = new ethers.JsonRpcProvider(CONFIG.L1_RPC_URL);
    const wallet = new ethers.Wallet(CONFIG.SEQUENCER_PRIVATE_KEY, provider);
    
    const l1Bridge = new ethers.Contract(
        CONFIG.L1_BRIDGE_ADDRESS,
        L1_BRIDGE_ABI,
        wallet  // Use wallet instead of provider to enable transactions
    );

    // Test deposit
    const tx = await l1Bridge.depositToL2({
        value: ethers.parseEther("0.1")
    });
    await tx.wait();
    console.log("Deposit successful:", tx.hash);
}

testDeployment().catch(console.error); 