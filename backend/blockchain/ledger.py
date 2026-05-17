"""
SLT NEXUS - Tamper-Proof Cryptographic Blockchain Ledger
Implements the core block structures, SHA-256 linking, transaction record storage, and chain integrity verification.
"""

import os
import json
import hashlib
from datetime import datetime

LEDGER_DIR = r"c:\SLT_NEXUS\backend\data"
LEDGER_FILE_PATH = os.path.join(LEDGER_DIR, "blockchain_ledger.json")


class Block:
    def __init__(self, index: int, timestamp: str, transactions: list, previous_hash: str, nonce: int = 0, current_hash: str = ""):
        self.index = index
        self.timestamp = timestamp
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = current_hash if current_hash else self.calculate_hash()

    def calculate_hash(self) -> str:
        """Generate SHA-256 cryptographic hash of block contents."""
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce,
            "hash": self.hash
        }


class SLTBlockchain:
    def __init__(self):
        os.makedirs(LEDGER_DIR, exist_ok=True)
        self.chain = []
        self.load_chain()

    def create_genesis_block(self):
        """Create the starting block of the SLT Nexus ledger."""
        genesis_block = Block(
            index=0,
            timestamp=str(datetime.now()),
            transactions=[{
                "type": "GENESIS",
                "message": "SLT NEXUS Immutable Ledger Initialized. Next-Gen Web3 Telecommunications Infrastructure active."
            }],
            previous_hash="0"
        )
        self.chain.append(genesis_block)
        self.save_chain()

    def get_latest_block(self) -> Block:
        return self.chain[-1]

    def add_block(self, transactions: list) -> Block:
        """Create a new cryptographically bound block on the ledger."""
        latest_block = self.get_latest_block()
        new_block = Block(
            index=latest_block.index + 1,
            timestamp=str(datetime.now()),
            transactions=transactions,
            previous_hash=latest_block.hash
        )
        self.chain.append(new_block)
        self.save_chain()
        return new_block

    def is_chain_valid(self) -> tuple:
        """Recalculate hashes and trace links to mathematically verify zero data tampering."""
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]
            
            # Recalculate hash of current block
            if current.hash != current.calculate_hash():
                return False, f"Block #{current.index} has been altered! Current Hash does not match calculated hash."
                
            # Verify cryptographic connection to previous block
            if current.previous_hash != previous.hash:
                return False, f"Block #{current.index} link is broken! Previous Hash does not match."
                
        return True, "Blockchain integrity matches perfectly! 100% Secure."

    def save_chain(self):
        """Commit the entire chain history to immutable JSON file on disk."""
        serialized_chain = [block.to_dict() for block in self.chain]
        with open(LEDGER_FILE_PATH, "w") as f:
            json.dump(serialized_chain, f, indent=4)

    def load_chain(self):
        """Load and parse chain from JSON file."""
        if not os.path.exists(LEDGER_FILE_PATH):
            print("Ledger file not found. Initializing genesis block...")
            self.create_genesis_block()
            return

        try:
            with open(LEDGER_FILE_PATH, "r") as f:
                data = json.load(f)
                self.chain = []
                for b in data:
                    block = Block(
                        index=b["index"],
                        timestamp=b["timestamp"],
                        transactions=b["transactions"],
                        previous_hash=b["previous_hash"],
                        nonce=b["nonce"],
                        current_hash=b["hash"]
                    )
                    self.chain.append(block)
        except Exception as e:
            print(f"Error loading ledger: {e}. Reinitializing...")
            self.create_genesis_block()


# Quick diagnostic function to test blockchain integrity
if __name__ == "__main__":
    blockchain = SLTBlockchain()
    print(f"Blockchain active with {len(blockchain.chain)} blocks.")
    
    # Verify chain
    valid, msg = blockchain.is_chain_valid()
    print(f"Ledger Integrity Status: {msg}")
