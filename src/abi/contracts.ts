export const L1_BRIDGE_ABI = [
    "function depositToL2() external payable",
    "function submitBatch(bytes calldata batchData, bytes32 newStateRoot) external",
    "function verifyBatch(uint256 batchIndex, bytes calldata proof, bytes32 claimedStateRoot) external",
    "function receiveMessage(bytes calldata message) external"
]; 