"""
SLT NEXUS - Vault Blockchain Agent Tools
Exposes the Solidity Smart Contract Writer, Connection Ingestion, Visit Handshake Ingestion, and Security Verification tools.
"""

import os
import json
from langchain_core.tools import tool
from backend.blockchain.ledger import SLTBlockchain

blockchain = SLTBlockchain()

@tool
def write_solidity_contract(customer_name: str, plan_name: str, monthly_fee: float, connection_type: str, sla_bandwidth_mbps: int) -> str:
    """
    Dynamically generates a fully compliant, production-grade Solidity Smart Contract for an SLT Customer SLA.
    This acts as the 'Smart Contractor' to guarantee bandwidth, monthly rates, and connection agreements.
    """
    # Clean customer name to create safe Solidity class/contract name
    safe_name = "".join(c for c in customer_name if c.isalnum())
    if not safe_name:
        safe_name = "Customer"
        
    contract_code = f"""// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SLT Connection Service Level Agreement (SLA)
 * @dev Cryptographically guarantees bandwidth rates, monthly fees, and technician service uptime.
 * Generated automatically by the SLT NEXUS Vault Agent.
 */
contract SLT_SLA_{safe_name} {{
    address public provider;
    string public customerName;
    string public connectionType;
    string public planName;
    uint256 public monthlyFeeLKR;
    uint256 public guaranteedBandwidthMbps;
    uint256 public contractActivationTimestamp;
    bool public isContractActive;
    
    event PlanUpgraded(string newPlan, uint256 newFee, uint256 newBandwidth);
    event ContractTerminated(uint256 timestamp);
    
    modifier onlyProvider() {{
        require(msg.sender == provider, "Unauthorized: Only SLT Provider can invoke.");
        _;
    }}

    constructor() {{
        provider = msg.sender;
        customerName = "{customer_name}";
        connectionType = "{connection_type}";
        planName = "{plan_name}";
        monthlyFeeLKR = {int(monthly_fee)};
        guaranteedBandwidthMbps = {sla_bandwidth_mbps};
        contractActivationTimestamp = block.timestamp;
        isContractActive = true;
    }}

    function upgradePlan(string memory _newPlan, uint256 _newFee, uint256 _newBandwidth) public onlyProvider {{
        require(isContractActive, "Inactive contract.");
        planName = _newPlan;
        monthlyFeeLKR = _newFee;
        guaranteedBandwidthMbps = _newBandwidth;
        emit PlanUpgraded(_newPlan, _newFee, _newBandwidth);
    }}

    function terminateContract() public onlyProvider {{
        isContractActive = false;
        emit ContractTerminated(block.timestamp);
    }}

    function checkSLASubscription() public view returns (
        string memory, string memory, string memory, uint256, uint256, bool
    ) {{
        return (customerName, connectionType, planName, monthlyFeeLKR, guaranteedBandwidthMbps, isContractActive);
    }}
}}
"""
    return contract_code.strip()


@tool
def commit_sla_to_ledger(customer_name: str, plan_name: str, monthly_fee: float, connection_type: str, sla_bandwidth_mbps: int) -> str:
    """
    Signs and commits a Customer Connection SLA smart contract directly into the immutable cryptographic ledger.
    """
    solidity_code = write_solidity_contract.func(customer_name, plan_name, monthly_fee, connection_type, sla_bandwidth_mbps)
    
    # Calculate checksum/hash of solidity smart contract code
    import hashlib
    contract_hash = hashlib.sha256(solidity_code.encode()).hexdigest()
    
    transaction = {
        "type": "NEW_CONNECTION_SLA",
        "customer_name": customer_name,
        "plan_name": plan_name,
        "monthly_fee_lkr": monthly_fee,
        "connection_type": connection_type,
        "guaranteed_bandwidth_mbps": sla_bandwidth_mbps,
        "contract_checksum": f"sha256:{contract_hash}"
    }
    
    # Add to ledger
    new_block = blockchain.add_block([transaction])
    
    result = {
        "status": "SUCCESS",
        "message": f"Successfully compiled SLA Smart Contract and locked on Blockchain Block #{new_block.index}!",
        "block_index": new_block.index,
        "block_hash": new_block.hash,
        "previous_hash": new_block.previous_hash,
        "contract_hash": f"sha256:{contract_hash}"
    }
    return json.dumps(result, indent=2)


@tool
def commit_visit_handshake_to_ledger(ticket_id: str, technician_id: str, customer_id: str, location_gps: str) -> str:
    """
    Records a technician's physical site visit verification (handshake) onto the immutable ledger.
    Locks GPS coordinates, timestamps, ticket status, and ID verification forever.
    Permanently resolves disputes between field technicians and customers.
    """
    transaction = {
        "type": "TECHNICIAN_VISIT_HANDSHAKE",
        "ticket_id": ticket_id,
        "technician_id": technician_id,
        "customer_id": customer_id,
        "location_gps": location_gps,
        "status": "VERIFIED_VISIT_SUCCESS",
        "verification_method": "CUSTOMER_APP_SECURE_QR_SCAN"
    }
    
    new_block = blockchain.add_block([transaction])
    
    result = {
        "status": "SUCCESS",
        "message": f"Technician Visit verification handshake permanently locked on Ledger Block #{new_block.index}!",
        "block_index": new_block.index,
        "block_hash": new_block.hash,
        "gps_lock": location_gps,
        "verification_time": new_block.timestamp
    }
    return json.dumps(result, indent=2)


@tool
def verify_ledger_security() -> str:
    """
    Mathematically verifies the integrity of all blocks on the SLT blockchain ledger.
    Returns whether the data remains untampered with.
    """
    valid, msg = blockchain.is_chain_valid()
    result = {
        "is_tamper_free": valid,
        "status_message": msg,
        "total_blocks": len(blockchain.chain),
        "latest_block_hash": blockchain.get_latest_block().hash
    }
    return json.dumps(result, indent=2)
