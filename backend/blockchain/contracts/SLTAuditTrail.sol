// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SLT NEXUS Audit Trail
 * @dev Stores cryptographic hashes of SLT operations (Connections, Faults, Payments) securely on-chain.
 */
contract SLTAuditTrail {
    
    struct AuditRecord {
        string actionType;
        string dataHash;
        uint256 timestamp;
        address recordedBy;
    }

    mapping(string => AuditRecord) public records;
    string[] public recordKeys; // To keep track of all inserted records
    
    event RecordLogged(string indexed actionType, string indexed dataHash, uint256 timestamp, address recordedBy);

    /**
     * @dev Logs a new action hash into the blockchain ledger.
     * @param _actionType The type of action (e.g., "NEW_CONNECTION", "FAULT_RESOLVED").
     * @param _dataHash The SHA-256 hash of the specific transaction details.
     */
    function logEvent(string memory _actionType, string memory _dataHash) public {
        // Prevent duplicate exact hashes
        require(records[_dataHash].timestamp == 0, "Record with this hash already exists.");

        records[_dataHash] = AuditRecord({
            actionType: _actionType,
            dataHash: _dataHash,
            timestamp: block.timestamp,
            recordedBy: msg.sender
        });
        
        recordKeys.push(_dataHash);

        emit RecordLogged(_actionType, _dataHash, block.timestamp, msg.sender);
    }

    /**
     * @dev Verify if a hash exists and has not been altered.
     */
    function verifyHash(string memory _dataHash) public view returns (bool, string memory, uint256) {
        if (records[_dataHash].timestamp == 0) {
            return (false, "", 0);
        }
        return (true, records[_dataHash].actionType, records[_dataHash].timestamp);
    }
    
    /**
     * @dev Get total number of records
     */
    function getTotalRecords() public view returns (uint256) {
        return recordKeys.length;
    }
}
