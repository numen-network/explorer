import {decode} from '@subsquid/ss58'
import wtmr from '@/assets/tokens/wtmr.svg'

export interface WellKnown {
    emoji: string
    label: string
}

interface Network {
    // genesis carries no timestamp, this is when the network launched
    genesisTime: string
    // an ERC20 carries no logo on chain, so the one it shows is the explorer's to give
    tokenIcons: Record<string, string>
    // protocol contracts and bridge operators keyed by lowercase EVM address
    accounts: Record<string, WellKnown>
}

const BRIDGE = '\u{1F309}'
const REVIVE_PAD = 'ee'.repeat(12)

// every value the explorer shows that the chain does not hold, filled in by hand
export const CONFIG = {
    socials: {
        github: 'https://github.com/numen-network/explorer',
        discord: 'https://discord.gg/ajPKdvrvJK',
        x: 'https://x.com/NumenOnchain',
        telegram: 'https://t.me/numen_network',
        bitcointalk: 'https://bitcointalk.org/index.php?action=profile;u=3763959',
        youtube: 'https://www.youtube.com/@numen_network',
    },
    // a sovereign account has no key to register an identity with, so the name
    // it goes by is the explorer's to give
    wellKnown: {
        treasury: {emoji: '\u{1F3DB}\u{FE0F}', label: 'Treasury'} as WellKnown,
        prime: {emoji: '\u{1F511}', label: 'Prime'} as WellKnown,
    },
    // keyed by EVM chain id, a network missing here has none of these values,
    // like the testnet, which restarts at any time
    networks: {
        32026: {
            genesisTime: '2026-09-14T01:00:00Z',
            tokenIcons: {'0xa1795b3c6f74866c7def1df390f9e2e403dca2e9': wtmr.src},
            accounts: {
                '0x0cd52bf83734f86bf3c1e74b702a816001299e96': {emoji: BRIDGE, label: 'Hyperlane Bridge'},
                '0x31122dee12ef19c33ab9a6e6cfb5d505b83ed362': {emoji: BRIDGE, label: 'Hyperlane Fee'},
                '0x945e0ed8322dee37052ef17f6ec81648e6f5e832': {emoji: BRIDGE, label: 'Hyperlane Mailbox'},
                '0x35e3d979512ed11e348defdb0416b9e2c9fa5272': {emoji: BRIDGE, label: 'Hyperlane Hook'},
                '0x769d423d869b70de443ffba95ca21d7dd00ea41f': {emoji: BRIDGE, label: 'Hyperlane Relayer'},
                '0xadc527c355f37a8c8bf93e942657d955e610b112': {emoji: BRIDGE, label: 'Hyperlane Validator'},
                '0xc72c05f9a8605f69a05c4f88c386454fc9522778': {emoji: BRIDGE, label: 'Hyperlane Deployer'},
            },
        },
    } as Record<number, Network>,
}

function toEvmKey(id: string): string | null {
    if (/^0x[0-9a-fA-F]{40}$/.test(id)) return id.toLowerCase()
    let hex = id
    if (!hex.startsWith('0x')) {
        try {
            hex = decode(id).bytes
        } catch {
            return null
        }
    }
    const low = hex.toLowerCase()
    return low.length === 66 && low.endsWith(REVIVE_PAD) ? low.slice(0, 42) : null
}

export function wellKnownAccount(id: string, evmChainId: number): WellKnown | null {
    const accounts = CONFIG.networks[evmChainId]?.accounts
    if (!accounts) return null
    const key = toEvmKey(id)
    return key ? (accounts[key] ?? null) : null
}

// a timestamp the index holds, or for genesis the network's genesis time
export function datedOrGenesis(timestamp: string | null, height: number, evmChainId: number): string | null {
    return timestamp ?? (height === 0 ? (CONFIG.networks[evmChainId]?.genesisTime ?? null) : null)
}
