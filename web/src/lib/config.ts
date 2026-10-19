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
}

// every value the explorer shows that the chain does not hold, filled in by hand
export const CONFIG = {
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
        },
    } as Record<number, Network>,
}

// a timestamp the index holds, or for genesis the network's genesis time
export function datedOrGenesis(timestamp: string | null, height: number, evmChainId: number): string | null {
    return timestamp ?? (height === 0 ? (CONFIG.networks[evmChainId]?.genesisTime ?? null) : null)
}
