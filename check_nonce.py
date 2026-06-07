from web3 import Web3
from eth_account import Account
w3 = Web3(Web3.HTTPProvider('https://rpc-amoy.polygon.technology/'))
account = Account.from_key('e97e836598dc8a142750e6530bd7cb7e036c1e998291fd4873449b3b01e9379e')
try:
    tx = {
        'to': account.address,
        'value': 0,
        'gas': 2000000,
        'gasPrice': w3.eth.gas_price,
        'nonce': w3.eth.get_transaction_count(account.address),
        'data': b'test data',
        'chainId': 80002
    }
    signed_tx = w3.eth.account.sign_transaction(tx, account.key)
    raw_tx = signed_tx.raw_transaction if hasattr(signed_tx, 'raw_transaction') else signed_tx.rawTransaction
    tx_hash = w3.eth.send_raw_transaction(raw_tx)
    print('Tx Hash:', tx_hash.hex())
except Exception as e:
    print('Error:', e)
