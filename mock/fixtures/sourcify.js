// what Sourcify answered for the testnet sample token, field for field
const TOKEN_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Minimal ERC-20 used to exercise compile / deploy / call paths against the
/// numen Frontier EVM stack. Not production-grade; no ownership, mint, burn
/// or pausing logic.
contract Token {
    string public constant name = "Numen Sample Token";
    string public constant symbol = "NST";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "ERC20: allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "ERC20: to==0");
        uint256 fromBal = balanceOf[from];
        require(fromBal >= value, "ERC20: balance");
        unchecked {
            balanceOf[from] = fromBal - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }
}
`

export const NST = {
    match: 'exact_match',
    creationMatch: 'exact_match',
    runtimeMatch: 'exact_match',
    verifiedAt: '2026-10-10T04:16:46Z',
    chainId: '320261',
    address: '0xF7fE05A44bed503193f1D6A0C396F3410c9197a2',
    compilation: {
        language: 'Solidity',
        compiler: 'solc',
        compilerVersion: '0.8.24+commit.e11b9ed9',
        compilerSettings: {
            optimizer: {
                runs: 200,
                enabled: true,
            },
            evmVersion: 'cancun',
            remappings: [],
        },
        name: 'Token',
        fullyQualifiedName: 'project/contracts/Token.sol:Token',
    },
    sources: {'project/contracts/Token.sol': {content: TOKEN_SOL}},
    abi: [
        {
            type: 'constructor',
            inputs: [
                {
                    name: 'initialSupply',
                    type: 'uint256',
                    internalType: 'uint256',
                },
            ],
            stateMutability: 'nonpayable',
        },
        {
            name: 'Approval',
            type: 'event',
            inputs: [
                {
                    name: 'owner',
                    type: 'address',
                    indexed: true,
                    internalType: 'address',
                },
                {
                    name: 'spender',
                    type: 'address',
                    indexed: true,
                    internalType: 'address',
                },
                {
                    name: 'value',
                    type: 'uint256',
                    indexed: false,
                    internalType: 'uint256',
                },
            ],
            anonymous: false,
        },
        {
            name: 'Transfer',
            type: 'event',
            inputs: [
                {
                    name: 'from',
                    type: 'address',
                    indexed: true,
                    internalType: 'address',
                },
                {
                    name: 'to',
                    type: 'address',
                    indexed: true,
                    internalType: 'address',
                },
                {
                    name: 'value',
                    type: 'uint256',
                    indexed: false,
                    internalType: 'uint256',
                },
            ],
            anonymous: false,
        },
        {
            name: 'allowance',
            type: 'function',
            inputs: [
                {
                    name: '',
                    type: 'address',
                    internalType: 'address',
                },
                {
                    name: '',
                    type: 'address',
                    internalType: 'address',
                },
            ],
            outputs: [
                {
                    name: '',
                    type: 'uint256',
                    internalType: 'uint256',
                },
            ],
            stateMutability: 'view',
        },
        {
            name: 'approve',
            type: 'function',
            inputs: [
                {
                    name: 'spender',
                    type: 'address',
                    internalType: 'address',
                },
                {
                    name: 'value',
                    type: 'uint256',
                    internalType: 'uint256',
                },
            ],
            outputs: [
                {
                    name: '',
                    type: 'bool',
                    internalType: 'bool',
                },
            ],
            stateMutability: 'nonpayable',
        },
        {
            name: 'balanceOf',
            type: 'function',
            inputs: [
                {
                    name: '',
                    type: 'address',
                    internalType: 'address',
                },
            ],
            outputs: [
                {
                    name: '',
                    type: 'uint256',
                    internalType: 'uint256',
                },
            ],
            stateMutability: 'view',
        },
        {
            name: 'decimals',
            type: 'function',
            inputs: [],
            outputs: [
                {
                    name: '',
                    type: 'uint8',
                    internalType: 'uint8',
                },
            ],
            stateMutability: 'view',
        },
        {
            name: 'name',
            type: 'function',
            inputs: [],
            outputs: [
                {
                    name: '',
                    type: 'string',
                    internalType: 'string',
                },
            ],
            stateMutability: 'view',
        },
        {
            name: 'symbol',
            type: 'function',
            inputs: [],
            outputs: [
                {
                    name: '',
                    type: 'string',
                    internalType: 'string',
                },
            ],
            stateMutability: 'view',
        },
        {
            name: 'totalSupply',
            type: 'function',
            inputs: [],
            outputs: [
                {
                    name: '',
                    type: 'uint256',
                    internalType: 'uint256',
                },
            ],
            stateMutability: 'view',
        },
        {
            name: 'transfer',
            type: 'function',
            inputs: [
                {
                    name: 'to',
                    type: 'address',
                    internalType: 'address',
                },
                {
                    name: 'value',
                    type: 'uint256',
                    internalType: 'uint256',
                },
            ],
            outputs: [
                {
                    name: '',
                    type: 'bool',
                    internalType: 'bool',
                },
            ],
            stateMutability: 'nonpayable',
        },
        {
            name: 'transferFrom',
            type: 'function',
            inputs: [
                {
                    name: 'from',
                    type: 'address',
                    internalType: 'address',
                },
                {
                    name: 'to',
                    type: 'address',
                    internalType: 'address',
                },
                {
                    name: 'value',
                    type: 'uint256',
                    internalType: 'uint256',
                },
            ],
            outputs: [
                {
                    name: '',
                    type: 'bool',
                    internalType: 'bool',
                },
            ],
            stateMutability: 'nonpayable',
        },
    ],
    proxyResolution: {
        isProxy: false,
        proxyType: null,
        implementations: [],
    },
}

// a match on the bytecode but not the metadata hash, with no ABI
export const NST_PARTIAL = {...NST, match: 'match', creationMatch: null, runtimeMatch: 'match', abi: null}

const IERC20_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);

    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}
`

const LIBRARY_PATH = 'contracts/libraries/transfers/SafeTransferWithRevertReasons.sol'

const VAULT_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeTransfer} from "./libraries/transfers/SafeTransferWithRevertReasons.sol";

contract Vault {
    using SafeTransfer for IERC20;

    IERC20 public immutable asset;
    mapping(address => uint256) public shares;

    constructor(IERC20 asset_) {
        asset = asset_;
    }

    function deposit(uint256 amount) external {
        asset.safeTransferFrom(msg.sender, address(this), amount);
        shares[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external {
        shares[msg.sender] -= amount;
        asset.safeTransfer(msg.sender, amount);
    }
}
`

const SAFE_TRANSFER_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library SafeTransfer {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        require(token.transfer(to, value), "transfer failed");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        require(token.transferFrom(from, to, value), "transferFrom failed");
    }
}
`

const uint256 = name => ({internalType: 'uint256', name, type: 'uint256'})

// three files with the compiled one in the middle of Sourcify's list, built with
// the optimizer off and no EVM version named
export const VAULT = {
    ...NST,
    compilation: {
        language: 'Solidity',
        compiler: 'solc',
        compilerVersion: '0.8.20+commit.a1b79de6',
        compilerSettings: {optimizer: {enabled: false, runs: 200}, remappings: []},
        name: 'Vault',
        fullyQualifiedName: 'contracts/Vault.sol:Vault',
    },
    sources: {
        '@openzeppelin/contracts/token/ERC20/IERC20.sol': {content: IERC20_SOL},
        'contracts/Vault.sol': {content: VAULT_SOL},
        [LIBRARY_PATH]: {content: SAFE_TRANSFER_SOL},
    },
    abi: [
        {inputs: [{internalType: 'contract IERC20', name: 'asset_', type: 'address'}], stateMutability: 'nonpayable', type: 'constructor'},
        {inputs: [uint256('amount')], name: 'deposit', outputs: [], stateMutability: 'nonpayable', type: 'function'},
        {inputs: [uint256('amount')], name: 'withdraw', outputs: [], stateMutability: 'nonpayable', type: 'function'},
    ],
}

export const VAULT_FILES = ['contracts/Vault.sol', '@openzeppelin/contracts/token/ERC20/IERC20.sol', LIBRARY_PATH, 'ABI']

// a token behind an EIP-1967 proxy, Sourcify names the implementation in checksum case
export const PROXIED = {
    ...NST,
    proxyResolution: {isProxy: true, proxyType: 'EIP1967Proxy', implementations: [{address: '0x5FbDB2315678afecb367f032d93F642f64180aa3', name: 'Token'}]},
}

const TOKEN_VY = `# pragma version ^0.4.0

event Transfer:
    sender: indexed(address)
    receiver: indexed(address)
    value: uint256

name: public(String[32])
balanceOf: public(HashMap[address, uint256])

@deploy
def __init__(supply: uint256):
    self.name = "Vyper Sample"
    self.balanceOf[msg.sender] = supply
    log Transfer(empty(address), msg.sender, supply)

@external
def transfer(receiver: address, value: uint256) -> bool:
    self.balanceOf[msg.sender] -= value
    self.balanceOf[receiver] += value
    log Transfer(msg.sender, receiver, value)
    return True
`

// Vyper sets optimize where solc sets optimizer
export const VYPER = {
    ...NST,
    compilation: {
        language: 'Vyper',
        compiler: 'vyper',
        compilerVersion: '0.4.0+commit.e9db8d9f',
        compilerSettings: {evmVersion: 'cancun', optimize: 'gas'},
        name: 'token',
        fullyQualifiedName: 'contracts/token.vy:token',
    },
    sources: {'contracts/token.vy': {content: TOKEN_VY}},
}

// over a thousand lines, past the card's height and into a four digit gutter
export const LONG = {...NST, sources: {'project/contracts/Token.sol': {content: Array(24).fill(TOKEN_SOL).join('')}}}

// Sourcify's own answers for a contract nobody verified and for a chain it doesn't serve
export const NOT_VERIFIED = {match: null, creationMatch: null, runtimeMatch: null, chainId: '32026', address: '0xA1795B3C6f74866C7Def1Df390F9E2e403DCA2e9'}
export const UNSUPPORTED_CHAIN = {customCode: 'unsupported_chain', message: 'Chain 32026 not found', errorId: '4dee5172-9e62-4619-940e-5cfd66434859'}
