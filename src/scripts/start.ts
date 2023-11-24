import { TestEnvironment } from '../test/testEnvironment';
import { CONFIG } from '../config';

async function main() {
    const testnet = new TestEnvironment(CONFIG);
    await testnet.start();
    
    process.on('SIGINT', () => {
        console.log('Shutting down L2 testnet...');
        process.exit();
    });
}

main().catch(console.error); 