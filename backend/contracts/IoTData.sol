// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IoTData
 * @dev Smart contract for storing and verifying IoT sensor data
 */
contract IoTData is AccessControl, ReentrancyGuard {

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEVICE_ROLE = keccak256("DEVICE_ROLE");
    bytes32 public constant ANALYST_ROLE = keccak256("ANALYST_ROLE");
    
    struct SensorData {
        string deviceId;
        uint256 timestamp;
        string data;
        string dataType;
        string location;
        bytes32 dataHash;
    }
    
    struct DataBatch {
        bytes32 merkleRoot;
        uint256 fromIndex;
        uint256 toIndex;
        uint256 timestamp;
        string description;
    }
    
    mapping(uint256 => SensorData) private sensorRecords;
    mapping(string => uint256[]) private deviceRecords;
    mapping(bytes32 => bool) private verifiedMerkleRoots;
    mapping(bytes32 => DataBatch) private dataBatches;
    bytes32[] private batchList;

    uint256 private recordCounter;

    // Events
    event DataStored(uint256 indexed recordId, string deviceId, uint256 timestamp, string dataType, string data);
    event BatchCreated(bytes32 indexed batchId, bytes32 merkleRoot, uint256 fromIndex, uint256 toIndex, uint256 timestamp);

    /**
     * @dev Constructor sets up admin role for the deployer
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(DEVICE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(ANALYST_ROLE, ADMIN_ROLE);
    }

    /**
     * @dev Store IoT sensor data on the blockchain
     */
    function storeData(
        string calldata _deviceId, 
        string calldata _data, 
        string calldata _dataType, 
        string calldata _location
    ) external nonReentrant returns (uint256) {
        require(
            hasRole(DEVICE_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender),
            "Must have device or admin role"
        );

        bytes32 dataHash = keccak256(abi.encodePacked(_deviceId, block.timestamp, _data, _dataType, _location));
        uint256 currentRecordId = recordCounter;
        recordCounter++;

        sensorRecords[currentRecordId] = SensorData(_deviceId, block.timestamp, _data, _dataType, _location, dataHash);
        deviceRecords[_deviceId].push(currentRecordId);

        emit DataStored(currentRecordId, _deviceId, block.timestamp, _dataType, _data);
        return currentRecordId;
    }

    /**
     * @dev Create a Merkle root for a batch of records
     */
    function createBatch(
        uint256 _fromIndex,
        uint256 _toIndex,
        bytes32 _merkleRoot,
        string calldata _description
    ) external nonReentrant returns (bytes32) {
        require(hasRole(ADMIN_ROLE, msg.sender), "Must have admin role");
        require(_toIndex >= _fromIndex, "Invalid index range");
        require(_toIndex < recordCounter, "To-index out of range");

        bytes32 batchId = keccak256(abi.encodePacked(_fromIndex, _toIndex, _merkleRoot, block.timestamp));

        dataBatches[batchId] = DataBatch(_merkleRoot, _fromIndex, _toIndex, block.timestamp, _description);
        batchList.push(batchId);
        verifiedMerkleRoots[_merkleRoot] = true;

        emit BatchCreated(batchId, _merkleRoot, _fromIndex, _toIndex, block.timestamp);
        return batchId;
    }

    /**
     * @dev Verify a data record against a Merkle proof
     */
    function verifyRecord(
        uint256 _recordId,
        bytes32 _merkleRoot,
        bytes32[] calldata _merkleProof
    ) external view returns (bool) {
        require(verifiedMerkleRoots[_merkleRoot], "Unknown Merkle root");
        require(_recordId < recordCounter, "Record doesn't exist");

        bytes32 leaf = sensorRecords[_recordId].dataHash;
        return MerkleProof.verify(_merkleProof, _merkleRoot, leaf);
    }

    function getBatchCount() external view returns (uint256) {
        return batchList.length;
    }

    function getBatchByIndex(uint256 _index) external view returns (
        bytes32 batchId,
        bytes32 merkleRoot,
        uint256 fromIndex,
        uint256 toIndex,
        uint256 timestamp,
        string memory description
    ) {
        require(_index < batchList.length, "Batch index out of range");
        batchId = batchList[_index];
        DataBatch storage batch = dataBatches[batchId];
        return (
            batchId,
            batch.merkleRoot,
            batch.fromIndex,
            batch.toIndex,
            batch.timestamp,
            batch.description
        );
    }

    function getData(uint256 index) external view returns (
        string memory, 
        uint256, 
        string memory, 
        string memory, 
        string memory
    ) {
        require(index < recordCounter, "Record does not exist");
        SensorData storage record = sensorRecords[index];
        return (
            record.deviceId, 
            record.timestamp, 
            record.data, 
            record.dataType, 
            record.location
        );
    }

    function getRecordCount() external view returns (uint256) {
        return recordCounter;
    }

    function getDeviceRecords(string calldata _deviceId) external view returns (uint256[] memory) {
        return deviceRecords[_deviceId];
    }

    function getLatestDeviceData(string calldata _deviceId) external view returns (
        uint256, 
        uint256, 
        string memory, 
        string memory, 
        string memory
    ) {
        uint256[] storage records = deviceRecords[_deviceId];
        require(records.length > 0, "No records for this device");

        uint256 latestIndex = records[records.length - 1];
        SensorData storage record = sensorRecords[latestIndex];
        return (
            latestIndex,
            record.timestamp, 
            record.data, 
            record.dataType, 
            record.location
        );
    }

    function getDeviceMetrics(
        string calldata _deviceId,
        string calldata _dataType,
        uint256 _fromTimestamp,
        uint256 _toTimestamp
    ) external view returns (
        uint256 recordCount,
        uint256 firstTimestamp,
        uint256 lastTimestamp
    ) {
        uint256[] storage records = deviceRecords[_deviceId];
        uint256 count = 0;
        uint256 firstTs = 0;
        uint256 lastTs = 0;

        for (uint256 i = 0; i < records.length; i++) {
            SensorData storage record = sensorRecords[records[i]];
            if (_fromTimestamp > 0 && record.timestamp < _fromTimestamp) continue;
            if (_toTimestamp > 0 && record.timestamp > _toTimestamp) continue;
            if (bytes(_dataType).length > 0 && keccak256(bytes(record.dataType)) != keccak256(bytes(_dataType))) continue;

            count++;
            if (firstTs == 0 || record.timestamp < firstTs) {
                firstTs = record.timestamp;
            }
            if (record.timestamp > lastTs) {
                lastTs = record.timestamp;
            }
        }

        return (count, firstTs, lastTs);
    }

    function grantDeviceRole(address account) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        grantRole(DEVICE_ROLE, account);
    }

    function grantAnalystRole(address account) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        grantRole(ANALYST_ROLE, account);
    }

    function revokeRole(bytes32 role, address account) public override {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        super.revokeRole(role, account);
    }
}
