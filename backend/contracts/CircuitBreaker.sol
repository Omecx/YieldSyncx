// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CircuitBreaker
 * @dev Emergency stop mechanism for smart contract operations
 */
abstract contract CircuitBreaker is Pausable, AccessControl {
    bytes32 public constant CIRCUIT_BREAKER_ROLE = keccak256("CIRCUIT_BREAKER_ROLE");
    
    event CircuitBreakerTriggered(address indexed triggeredBy, uint256 timestamp);
    event CircuitBreakerReset(address indexed resetBy, uint256 timestamp);
    
    constructor() {
        _grantRole(CIRCUIT_BREAKER_ROLE, msg.sender);
    }
    
    function triggerCircuitBreaker() external onlyRole(CIRCUIT_BREAKER_ROLE) whenNotPaused {
        _pause();
        emit CircuitBreakerTriggered(msg.sender, block.timestamp);
    }
    
    function resetCircuitBreaker() external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused {
        _unpause();
        emit CircuitBreakerReset(msg.sender, block.timestamp);
    }
}

// Enhanced IoTData contract with circuit breaker
contract IoTData is IoTData, CircuitBreaker {
    function storeData(
        string calldata _deviceId, 
        string calldata _data, 
        string calldata _dataType, 
        string calldata _location
    ) external override nonReentrant whenNotPaused returns (uint256) {
        return super.storeData(_deviceId, _data, _dataType, _location);
    }
    
    function createBatch(
        uint256 _fromIndex,
        uint256 _toIndex,
        bytes32 _merkleRoot,
        string calldata _description
    ) external override nonReentrant whenNotPaused returns (bytes32) {
        return super.createBatch(_fromIndex, _toIndex, _merkleRoot, _description);
    }
}