import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {validatorsData} from '@/lib/gql'
import {ValidatorsTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Validators'}

export default async function ValidatorsPage() {
    const [chain, {validators}] = await Promise.all([chainProps(), validatorsData()])
    const active = validators.filter(v => v.active).length

    return (
        <div>
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">Validators</h1>
                <span className="text-xs text-muted-foreground">
                    {fmtInt(active)} active · {fmtInt(validators.length)} known
                </span>
            </div>
            <Card size="flush" className="mt-3">
                <ValidatorsTable rows={validators} chain={chain} />
            </Card>
        </div>
    )
}
