// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract L2Bridge {
    address public l1Bridge;
    mapping(address => uint256) public balances;
    uint256 public messageNonce;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event MessageSent(address indexed sender, bytes message, uint256 nonce);
    
    function setL1Bridge(address _l1Bridge) external {
        require(l1Bridge == address(0), "L1 bridge already set");
        l1Bridge = _l1Bridge;
    }
    
    function deposit(address user, uint256 amount) external {
        require(msg.sender == l1Bridge, "Only L1 bridge can deposit");
        balances[user] += amount;
        emit Deposit(user, amount);
    }
    
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        
        // Create withdrawal message for L1
        bytes memory message = abi.encodeWithSignature(
            "processWithdrawal(address,uint256)",
            msg.sender,
            amount
        );
        
        // Send message to L1
        sendMessageToL1(message);
        emit Withdrawal(msg.sender, amount);
    }
    
    function sendMessageToL1(bytes memory message) public {
        emit MessageSent(msg.sender, message, messageNonce);
        messageNonce++;
        // In a real implementation, this would be picked up by the sequencer
        // and included in the next batch to L1
    }
    
    function relayMessage(
        address target,
        bytes memory message,
        uint256 nonce
    ) external {
        require(msg.sender == l1Bridge, "Only L1 bridge can relay messages");
        require(nonce == messageNonce, "Invalid nonce");
        messageNonce++;
        
        // Execute the message
        (bool success, ) = target.call(message);
        require(success, "Message execution failed");
    }
} 