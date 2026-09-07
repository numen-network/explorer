import {Card} from '@/components/ui/card'
import type {ChainProps} from '@/lib/chain'
import {LocksTable} from './LocksTable'
import type {LockRow} from './shared'

export default function Locks({rows, chain}: {rows: LockRow[]; chain: ChainProps}) {
    return (
        <div>
            <Card size="flush">
                <LocksTable rows={rows.map(r => ({...r, amount: r.amount.toString()}))} chain={chain} />
            </Card>
            <p className="mt-2 text-xs text-dim">frozen locks overlap rather than add up, the frozen balance follows the largest one</p>
        </div>
    )
}
