// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract RateLimiter {
    struct RateLimit {
        uint256 limit;
        uint256 window;
        uint256 lastReset;
        uint256 count;
    }
    
    mapping(address => mapping(bytes4 => RateLimit)) public rateLimits;
    
    event RateLimitExceeded(address indexed caller, bytes4 indexed selector);
    
    modifier rateLimit(uint256 _limit, uint256 _window) {
        bytes4 selector = msg.sig;
        RateLimit storage limit = rateLimits[msg.sender][selector];
        
        if (block.timestamp >= limit.lastReset + limit.window) {
            limit.lastReset = block.timestamp;
            limit.count = 0;
            limit.limit = _limit;
            limit.window = _window;
        }
        
        require(limit.count < limit.limit, "Rate limit exceeded");
        limit.count++;
        
        _;
    }
    
    function getRateLimitInfo(address _user, bytes4 _selector) external view returns (
        uint256 limit,
        uint256 window,
        uint256 count,
        uint256 nextReset
    ) {
        RateLimit storage rl = rateLimits[_user][_selector];
        return (
            rl.limit,
            rl.window,
            rl.count,
            rl.lastReset + rl.window
        );
    }
}

contract IoTDataRateLimited is IoTDataEnhanced, RateLimiter {
    function storeData(
        string calldata _deviceId, 
        string calldata _data, 
        string calldata _dataType, 
        string calldata _location
    ) external override nonReentrant whenNotPaused rateLimit(100, 1 hours) returns (uint256) {
        return super.storeData(_deviceId, _data, _dataType, _location);
    }
}