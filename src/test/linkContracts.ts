import { ethers } from 'ethers';
import { CONFIG } from '../config';
import { L1_BRIDGE_ABI } from '../abi/contracts';

async function linkContracts() {
    const provider = new ethers.JsonRpcProvider(CONFIG.L1_RPC_URL);
    const wallet = new ethers.Wallet(CONFIG.SEQUENCER_PRIVATE_KEY, provider);
    
    const l1Bridge = new ethers.Contract(
        CONFIG.L1_BRIDGE_ADDRESS,
        L1_BRIDGE_ABI,
        wallet
    );

    console.log('Setting L2 bridge address on L1Bridge...');
    const tx1 = await l1Bridge.setL2Bridge(CONFIG.L2_BRIDGE_ADDRESS);
    await tx1.wait();
    
    console.log('Contracts linked successfully!');
}

linkContracts().catch(console.error); 