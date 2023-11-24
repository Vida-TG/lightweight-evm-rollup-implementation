import { TestEnvironment } from './test/testEnvironment';
import { CONFIG } from './config';

async function main() {
    console.log('Starting L2 testnet...');
    const testnet = new TestEnvironment(CONFIG);
    await testnet.start();
    console.log('L2 testnet is running!');
}

main().catch(console.error); 