import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import type {ChainProps, DbHead} from '@/lib/chain'
import {datedOrGenesis} from '@/lib/config'
import {sessionsPage} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {SessionsTable} from './table'

type SearchParams = Record<string, string | string[] | undefined>

export default async function ValidatorSessions({sp, chain, head, total}: {sp: SearchParams; chain: ChainProps; head: DbHead; total: number}) {
    const pg = paging(sp)
    const data = await sessionsPage(pg.size, pg.offset, head.height)
    return (
        <>
            <Card size="flush">
                <SessionsTable rows={data.sessions.map(s => ({...s, timestamp: datedOrGenesis(s.timestamp, s.startBlock, chain.evmChainId)}))} head={head.height} length={chain.sessionLength} />
            </Card>
            <Pager paging={pg} total={total} href="/validators?tab=sessions" />
        </>
    )
}
