import Approx from '@/components/Approx'
import {shortAddr} from '@/components/AddressText'
import {RingChart} from '@/components/charts'
import Pager from '@/components/Pager'
import Swatch from '@/components/Swatch'
import TokenSelect from '@/components/TokenSelect'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {COUNTERPARTY_SORTS, loadCounterparty, type CounterpartySort} from '@/lib/actionFilters'
import {ACCENT, GRAY, tint} from '@/lib/chartColors'
import {fmtApprox, fmtInt, fmtPct, shortHash} from '@/lib/format'
import {counterpartyTokens, RING_TOP, tokenTransferPairsFor, transferPairsFor, type AccountRef, type Counterparties as Pairs, type CounterpartyRow} from '@/lib/gql'
import {identityLabel} from '@/lib/identity'
import {paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'
import {CounterpartiesTable, Party, type CounterpartyAsset} from './CounterpartiesTable'
import {tabHref, type TabCtx} from './shared'

// the biggest counterparty deepest, down to the lightest shade at the ring's tail
const SHADES = [1, 0.78, 0.58, 0.4, 0.24].map(share => tint(ACCENT, share))

interface Slice {
    party: AccountRef | string | null
    amount: bigint
    // in basis points
    share: bigint
    color: string
}

// the top few each get a slice, past RING_TOP the rest pool into Others. each
// share is cut to a basis point and the biggest takes what the cuts leave, so
// the legend adds up to the whole
function slicesOf(top: CounterpartyRow[], count: number, total: bigint, amountOf: (r: CounterpartyRow) => bigint): Slice[] {
    const shown = count > RING_TOP ? top.slice(0, RING_TOP - 1) : top
    const slices: Slice[] = shown.map((r, i) => ({party: r.counterparty, amount: amountOf(r), share: 0n, color: SHADES[i]}))
    if (count > shown.length) slices.push({party: null, amount: total - slices.reduce((n, s) => n + s.amount, 0n), share: 0n, color: GRAY})
    if (total === 0n) return slices
    for (const s of slices) s.share = (s.amount * 10000n) / total
    const biggest = slices.reduce((b, s) => (s.amount > b.amount ? s : b))
    biggest.share = 10000n - slices.reduce((n, s) => (s === biggest ? n : n + s.share), 0n)
    return slices
}

function RingCard({title, slices, count, total, self, ss58, asset}: {title: string; slices: Slice[]; count: number; total: bigint; self: string; ss58: number; asset: CounterpartyAsset}) {
    const others = count - slices.filter(s => s.party != null).length
    const label = (s: Slice) => (s.party == null ? `Others (${fmtInt(others)})` : typeof s.party === 'string' ? shortHash(s.party) : (identityLabel(s.party) ?? shortAddr(ss58Encode(s.party.id, ss58))))
    const share = (s: Slice) => fmtPct(s.share, total > 0n ? 10000n : 0n)
    return (
        <Card className="min-w-0 gap-3 py-4 [--card-spacing:--spacing(5)]">
            <CardHeader>
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            </CardHeader>
            {count === 0 ? (
                <CardContent className="py-2 text-sm text-muted-foreground">No transfers yet.</CardContent>
            ) : (
                <CardContent className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
                    <ul aria-label={title} className="grid grid-cols-[auto_auto_auto_auto] items-center gap-x-3 gap-y-1.5 text-xs">
                        {slices.map((s, i) => (
                            <li key={i} className="col-span-4 grid grid-cols-subgrid items-center">
                                <Swatch color={s.color} />
                                <span className="min-w-0">{s.party == null ? label(s) : <Party party={s.party} self={self} ss58={ss58} />}</span>
                                <span className="text-right font-mono tabular-nums">
                                    <Approx planck={s.amount} decimals={asset.decimals} symbol={asset.symbol} />
                                </span>
                                <span className="text-right text-muted-foreground tabular-nums">{share(s)}</span>
                            </li>
                        ))}
                    </ul>
                    <RingChart total={fmtInt(count)} unit="Accounts" slices={slices.map(s => ({label: label(s), value: Number(s.amount), color: s.color, tip: `${fmtApprox(s.amount, asset.decimals, asset.symbol)} · ${share(s)}`}))} />
                </CardContent>
            )}
        </Card>
    )
}

// who the account moved a token with, one token at a time since amounts of two
// tokens never add up. native says it moved the native token at all, without
// it the first contract token opens
export default async function Counterparties({hex, addr, chain, sp, evm, native}: TabCtx & {evm: string | null; native: boolean}) {
    const tokens = evm ? await counterpartyTokens(evm) : []
    const {token: wanted, sort} = loadCounterparty(sp)
    const token = tokens.find(t => t.id === wanted) ?? (native ? null : tokens[0])
    const pg = paging(sp)
    const pairs: Pairs = token ? await tokenTransferPairsFor(evm!, token.id, sort, pg.size, pg.offset) : await transferPairsFor(hex, sort, pg.size, pg.offset)
    const asset: CounterpartyAsset = token ? {decimals: token.decimals ?? 0, symbol: token.symbol ?? shortHash(token.id)} : {decimals: chain.decimals, symbol: chain.symbol}
    const self = token ? evm! : hex
    // the default sort and the native token stay out of the url
    const href = (t: string, s: CounterpartySort) => tabHref(addr, 'counterparties', {token: t, sort: s === 'in-volume' ? '' : s})
    const picked = token?.id ?? ''
    const hrefs = Object.fromEntries(COUNTERPARTY_SORTS.map(s => [s, href(picked, s)])) as Record<CounterpartySort, string>
    const volumeIn = BigInt(pairs.volumeIn)
    const volumeOut = BigInt(pairs.volumeOut)
    return (
        <div className="flex flex-col gap-4">
            {tokens.length > 0 && (
                <TokenSelect tokens={tokens} native={native ? chain.symbol : undefined} value={picked} href={t => href(t, sort)} />
            )}
            <div className="grid gap-4 lg:grid-cols-2">
                <RingCard title={`${asset.symbol} Transfer-in Accounts`} slices={slicesOf(pairs.ins, pairs.nIn, volumeIn, r => BigInt(r.amountIn))} count={pairs.nIn} total={volumeIn} self={self} ss58={chain.ss58} asset={asset} />
                <RingCard title={`${asset.symbol} Transfer-out Accounts`} slices={slicesOf(pairs.outs, pairs.nOut, volumeOut, r => BigInt(r.amountOut))} count={pairs.nOut} total={volumeOut} self={self} ss58={chain.ss58} asset={asset} />
            </div>
            <div>
                <Card size="flush">
                    <CounterpartiesTable rows={pairs.rows} first={pg.offset + 1} self={self} ss58={chain.ss58} asset={asset} sort={sort} hrefs={hrefs} />
                </Card>
                <Pager paging={pg} total={pairs.total} href={href(picked, sort)} />
            </div>
        </div>
    )
}
