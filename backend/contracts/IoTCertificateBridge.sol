// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IoTData.sol";
import "./NFTData.sol";

contract IoTCertificationBridge {
    IoTData public iotContract;
    NFTData public nftContract;
    
    event DataCertified(
        uint256 indexed recordId,
        uint256 indexed tokenId,
        bytes32 dataHash,
        address certifier
    );
    
    constructor(address _iotContract, address _nftContract) {
        iotContract = IoTData(_iotContract);
        nftContract = NFTData(_nftContract);
    }
    
    function certifyDataRecord(
        uint256 recordId,
        string memory tokenURI,
        string memory certificationLevel
    ) external returns (uint256) {
        require(
            iotContract.hasRole(iotContract.ANALYST_ROLE(), msg.sender),
            "Must be analyst to certify"
        );
        
        (string memory deviceId, uint256 timestamp, string memory data, 
         string memory dataType, string memory location) = iotContract.getData(recordId);
        
        bytes32 dataHash = keccak256(abi.encodePacked(deviceId, timestamp, data, dataType, location));
        
        uint256 tokenId = nftContract.mintCertificate(
            msg.sender,
            deviceId,
            string(abi.encodePacked("0x", toHexString(dataHash))),
            tokenURI,
            certificationLevel
        );
        
        emit DataCertified(recordId, tokenId, dataHash, msg.sender);
        return tokenId;
    }
    
    function toHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory str = new bytes(64);
        for (uint i = 0; i < 32; i++) {
            str[i*2] = hexChars[uint8(data[i] >> 4)];
            str[1+i*2] = hexChars[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}