import {BatchData} from './batch'
import {ZERO_ADDRESS, asErc20Transfer, asSync, type EvmLogData} from './evm'
import {Block, EvmLog, EvmTransaction, Extrinsic} from './model'
import {bookPair} from './pairs'

export interface LogSource {
    id: string
    logIndex: number
    transaction: EvmTransaction | null
    extrinsic: Extrinsic | null
    // the H160 that set the log off, the transaction sender or the account the
    // raising call dispatched as, undefined when no account did
    sender: string | undefined
    block: Block
    at: Date
    nativeFacade: string
}

/** Files a log along with the token transfer and the pair reserves it may report. */
export function recordLog(batch: BatchData, log: EvmLogData, src: LogSource): void {
    batch.evmLogs.push(
        new EvmLog({
            id: src.id,
            transaction: src.transaction,
            extrinsic: src.extrinsic,
            block: src.block,
            logIndex: src.logIndex,
            address: log.address,
            topic0: log.topics[0],
            topics: log.topics,
            data: Buffer.from(log.data.slice(2), 'hex'),
        })
    )
    const t = asErc20Transfer(log, src.nativeFacade)
    if (t != null) {
        const thirdParty = src.sender !== t.from && src.sender !== t.to
        batch.erc20Queue.push({...t, id: src.id, logIndex: src.logIndex, tx: src.transaction, extrinsic: src.extrinsic, thirdParty, block: src.block, timestamp: src.at})
        bookPair(batch.tokenPairDeltas, `${t.token}-`, t.from, t.to, t.amount, src.block.height)
        for (const addr of [t.from, t.to]) if (addr !== ZERO_ADDRESS) batch.touchEvm(addr, src.block.height, 0)
    }
    const sync = asSync(log)
    if (sync != null) batch.reserves.set(log.address, sync)
}
