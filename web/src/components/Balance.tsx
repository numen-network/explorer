import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'

// an account balance shows every decimal the chain tracks, zero padded. ink
// ends after the last nonzero digit among the first four, the rest goes faint
const LEAD = 4

export default function Balance({planck, chain}: {planck: string | bigint; chain: ChainProps}) {
    const v = BigInt(planck)
    const base = 10n ** BigInt(chain.decimals)
    const frac = (v % base).toString().padStart(chain.decimals, '0')
    const lead = frac.slice(0, LEAD).replace(/0+$/, '')
    return (
        <span>
            {fmtInt(v / base) + '.' + lead}
            <span className="text-dim">{frac.slice(lead.length)}</span> {chain.symbol}
        </span>
    )
}
