// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract L1Bridge {
    address public l2Bridge;
    address public sequencer;
    mapping(uint256 => bytes32) public stateRoots;
    mapping(bytes32 => bool) public isFraudProofSubmitted;
    uint256 public currentBatchIndex;
    uint256 public constant CHALLENGE_PERIOD = 7 days;
    mapping(bytes32 => uint256) public batchTimestamps;
    
    event BatchSubmitted(uint256 indexed batchIndex, bytes32 stateRoot, uint256 timestamp);
    event L2DepositInitiated(address indexed user, uint256 amount);
    event FraudProofSubmitted(uint256 indexed batchIndex, address challenger);
    event MessageReceived(address indexed sender, bytes message);
    
    constructor(address _sequencer) {
        sequencer = _sequencer;
    }
    
    function setL2Bridge(address _l2Bridge) external {
        require(l2Bridge == address(0), "L2 bridge already set");
        l2Bridge = _l2Bridge;
    }
    
    function submitBatch(
        bytes calldata /* batchData */,
        bytes32 newStateRoot
    ) external {
        require(msg.sender == sequencer, "Only sequencer can submit batches");
        
        // Store the new state root and timestamp
        stateRoots[currentBatchIndex] = newStateRoot;
        batchTimestamps[newStateRoot] = block.timestamp;
        
        emit BatchSubmitted(currentBatchIndex, newStateRoot, block.timestamp);
        currentBatchIndex++;
    }
    
    function verifyBatch(
        uint256 batchIndex,
        bytes calldata /* proof */,
        bytes32 /* claimedStateRoot */
    ) external {
        bytes32 storedStateRoot = stateRoots[batchIndex];
        require(storedStateRoot != bytes32(0), "Batch does not exist");
        require(
            block.timestamp <= batchTimestamps[storedStateRoot] + CHALLENGE_PERIOD,
            "Challenge period expired"
        );
        
        isFraudProofSubmitted[storedStateRoot] = true;
        emit FraudProofSubmitted(batchIndex, msg.sender);
    }
    
    function depositToL2() external payable {
        require(msg.value > 0, "Must deposit non-zero amount");
        emit L2DepositInitiated(msg.sender, msg.value);
    }
    
    function receiveMessage(bytes calldata message) external {
        require(msg.sender == l2Bridge, "Only L2 bridge can send messages");
        emit MessageReceived(msg.sender, message);
        // Process the message from L2
        (bool success, ) = address(this).call(message);
        require(success, "Message execution failed");
    }
} 