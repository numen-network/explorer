import Approx from '@/components/Approx'
import {NONE} from '@/components/Detail'
import StatTile from '@/components/StatTile'
import {BlockLink} from '@/components/links'
import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import type {RegistrarRow} from '@/lib/gql'

export function RegistrarTile({r, chain}: {r: RegistrarRow; chain: ChainProps}) {
    return (
        <StatTile
            label="Registrar"
            value={`#${r.index}`}
            beside={[
                {label: 'Fee', value: r.fee != null ? <Approx planck={r.fee} decimals={chain.decimals} symbol={chain.symbol} breakable /> : NONE},
                {label: 'Requests received', value: fmtInt(r.requestCount)},
                {label: 'Judgements given', value: fmtInt(r.givenCount)},
                {label: 'Last judgement', value: r.lastJudgementBlock != null ? <BlockLink height={r.lastJudgementBlock} /> : NONE},
                {label: 'Added', value: r.addedAt != null ? <BlockLink height={r.addedAt} /> : NONE},
            ]}
            pairs
        />
    )
}
