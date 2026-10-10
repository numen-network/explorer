const SOURCIFY = process.env.SOURCIFY_URL ?? 'https://sourcify.dev/server'

export interface SourcifyContract {
    match: string
    verifiedAt: string
    compilation: {
        language: string
        compiler: string
        compilerVersion: string
        fullyQualifiedName: string
        compilerSettings: {optimizer?: {enabled?: boolean; runs?: number}; evmVersion?: string}
    }
    sources: Record<string, {content: string}>
    abi: unknown[] | null
    proxyResolution: {isProxy: boolean; proxyType: string | null; implementations: {address: string; name?: string}[]} | null
}

export type SourcifyLookup = {status: 'verified'; contract: SourcifyContract} | {status: 'unverified'} | {status: 'unavailable'; reason: string}

// a 404 is Sourcify's answer for a contract nobody verified, any other failure leaves the question open
export async function sourcifyContract(chainId: number, address: string): Promise<SourcifyLookup> {
    const url = `${SOURCIFY}/v2/contract/${chainId}/${address}?fields=compilation,sources,abi,proxyResolution`
    const res = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(10_000)}).catch((e: Error) => e)
    if (res instanceof Error) return {status: 'unavailable', reason: res.message}
    if (res.status === 404) return {status: 'unverified'}
    if (!res.ok) return {status: 'unavailable', reason: (await res.json().catch(() => null))?.message ?? `HTTP ${res.status}`}
    return {status: 'verified', contract: await res.json()}
}

export const sourcifyRepoUrl = (chainId: number, address: string) => `https://repo.sourcify.dev/${chainId}/${address}`
