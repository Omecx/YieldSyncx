// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTData is ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant CERTIFIER_ROLE = keccak256("CERTIFIER_ROLE");
    
    Counters.Counter private _tokenIds;
    
    struct DataCertificate {
        string deviceId;
        string dataHash;
        uint256 timestamp;
        string certificationLevel;
        address certifier;
        bool revoked;
    }
    
    mapping(uint256 => DataCertificate) public certificates;
    mapping(string => uint256[]) public deviceCertificates;
    mapping(string => bool) public dataCertified;
    
    event CertificateIssued(uint256 indexed tokenId, string indexed deviceId, string dataHash, address certifier);
    event CertificateRevoked(uint256 indexed tokenId, address revoker);
    
    constructor() ERC721("IoT Data Certificate", "IOTDC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(CERTIFIER_ROLE, msg.sender);
    }
    
    function mintCertificate(
        address to,
        string memory deviceId,
        string memory dataHash,
        string memory tokenURI,
        string memory certificationLevel
    ) public onlyRole(CERTIFIER_ROLE) returns (uint256) {
        require(!dataCertified[dataHash], "Data already certified");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        certificates[newTokenId] = DataCertificate({
            deviceId: deviceId,
            dataHash: dataHash,
            timestamp: block.timestamp,
            certificationLevel: certificationLevel,
            certifier: msg.sender,
            revoked: false
        });
        
        deviceCertificates[deviceId].push(newTokenId);
        dataCertified[dataHash] = true;
        
        emit CertificateIssued(newTokenId, deviceId, dataHash, msg.sender);
        return newTokenId;
    }
    
    function revokeCertificate(uint256 tokenId) public onlyRole(CERTIFIER_ROLE) {
        require(_exists(tokenId), "Certificate does not exist");
        require(!certificates[tokenId].revoked, "Certificate already revoked");
        
        certificates[tokenId].revoked = true;
        emit CertificateRevoked(tokenId, msg.sender);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}