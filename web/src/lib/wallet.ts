export const WALLET_URL = process.env.WALLET_URL ?? 'https://wallet.numen-network.org'

// the wallet opens a link only on the chain whose genesis hash it carries
function walletHref(wallet: string, param: string, value: string, genesis: string): string {
    const url = new URL(wallet)
    url.searchParams.set(param, value)
    url.searchParams.set('genesis', genesis)
    return url.href
}

export function delegateHref(wallet: string, addr: string, genesis: string): string {
    return walletHref(wallet, 'delegate', addr, genesis)
}

export function voteHref(wallet: string, index: number, genesis: string): string {
    return walletHref(wallet, 'vote', String(index), genesis)
}
