import {Card} from '@/components/ui/card'
import type {ChainProps} from '@/lib/chain'
import {registrarsByIndex} from '@/lib/gql'
import type {IdentityJudgement} from '@/lib/identity'
import {ReceivedJudgementsTable} from './ReceivedJudgementsTable'

export default async function ReceivedJudgements({judgements, chain}: {judgements: IdentityJudgement[]; chain: ChainProps}) {
    const {registrars} = await registrarsByIndex(judgements.map(j => j.registrar))
    const rows = judgements.map(j => ({...j, seat: registrars.find(r => r.index === j.registrar)}))
    return (
        <Card size="flush">
            <ReceivedJudgementsTable rows={rows} chain={chain} />
        </Card>
    )
}
