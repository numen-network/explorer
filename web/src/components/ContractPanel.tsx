import type {ReactNode} from 'react'
import BytesToggle from '@/components/BytesToggle'
import CodeCard from '@/components/CodeCard'
import {DetailCard, DetailRow, NONE} from '@/components/Detail'
import {TimeCell} from '@/components/TimeCell'
import {EvmAddrLink, EvmTxLink, Jump} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import type {ContractData} from '@/lib/contract'
import {fmtInt} from '@/lib/format'
import {sourcifyRepoUrl, type SourcifyContract} from '@/lib/sourcify'

const VERIFY_GUIDE = 'https://docs.numen-network.org/en/evm/verify-a-contract/'

const MATCH: Record<string, {label: string; variant: 'pos' | 'primary'}> = {
    exact_match: {label: 'Exact match', variant: 'pos'},
    match: {label: 'Match', variant: 'primary'},
}

function ExtLink({href, children}: {href: string; children: ReactNode}) {
    return (
        <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            {children} <Jump />
        </a>
    )
}

function optimizer({optimizer: o}: SourcifyContract['compilation']['compilerSettings']) {
    if (!o) return NONE
    if (!o.enabled) return 'Off'
    return o.runs == null ? 'On' : `${fmtInt(o.runs)} runs`
}

function Implementations({proxy}: {proxy: NonNullable<SourcifyContract['proxyResolution']>}) {
    return (
        <span className="flex flex-wrap gap-x-3">
            {proxy.implementations.map(i => (
                <EvmAddrLink key={i.address} addr={i.address.toLowerCase()} />
            ))}
            {proxy.proxyType && <span className="text-muted-foreground">{proxy.proxyType}</span>}
        </span>
    )
}

function Creation({creation}: {creation: ContractData['creation']}) {
    if (!creation) return null
    return (
        <>
            <DetailRow label="Creation tx">
                <EvmTxLink hash={creation.id} />
            </DetailRow>
            <DetailRow label="Creation code">
                <BytesToggle hex={creation.input} />
            </DetailRow>
        </>
    )
}

function Verified({contract: c, address, data}: {contract: SourcifyContract; address: string; data: ContractData}) {
    const comp = c.compilation
    const match = MATCH[c.match]
    return (
        <div className="flex flex-col gap-4">
            <DetailCard>
                <DetailRow label="Status">
                    <Badge variant={match?.variant ?? 'secondary'}>{match?.label ?? c.match}</Badge>
                </DetailRow>
                <DetailRow label="Compiler">{`${comp.compiler} ${comp.compilerVersion}`}</DetailRow>
                <DetailRow label="Optimizer">{optimizer(comp.compilerSettings)}</DetailRow>
                <DetailRow label="EVM version">{comp.compilerSettings.evmVersion ?? NONE}</DetailRow>
                <DetailRow label="Contract">{comp.fullyQualifiedName}</DetailRow>
                {c.proxyResolution?.isProxy && (
                    <DetailRow label="Implementation">
                        <Implementations proxy={c.proxyResolution} />
                    </DetailRow>
                )}
                <DetailRow label="Verified">
                    <TimeCell iso={c.verifiedAt} cycle />
                </DetailRow>
                <DetailRow label="Verifier">
                    <ExtLink href={sourcifyRepoUrl(data.chainId, address)}>Sourcify</ExtLink>
                </DetailRow>
                <Creation creation={data.creation} />
            </DetailCard>
            {data.files.map(f => (
                <CodeCard key={f.title} file={f} />
            ))}
        </div>
    )
}

export default function ContractPanel({address, data}: {address: string; data: ContractData}) {
    const {lookup} = data
    switch (lookup.status) {
        case 'verified':
            return <Verified contract={lookup.contract} address={address} data={data} />
        case 'unverified':
            return (
                <DetailCard>
                    <DetailRow label="Status">
                        <Badge variant="idle">Not verified</Badge>
                        <span className="ml-3">
                            <ExtLink href={VERIFY_GUIDE}>How to verify</ExtLink>
                        </span>
                    </DetailRow>
                    <Creation creation={data.creation} />
                </DetailCard>
            )
        case 'unavailable':
            return (
                <DetailCard>
                    <DetailRow label="Status">
                        <Badge variant="warn">Unavailable</Badge>
                        <span className="ml-3 text-muted-foreground">{lookup.reason}</span>
                    </DetailRow>
                    <Creation creation={data.creation} />
                </DetailCard>
            )
    }
}
