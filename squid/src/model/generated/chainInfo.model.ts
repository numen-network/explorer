import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"

/**
 * single row the explorer reads instead of talking to a node
 */
@Entity_()
export class ChainInfo {
    constructor(props?: Partial<ChainInfo>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    name!: string

    @StringColumn_({nullable: false})
    symbol!: string

    @IntColumn_({nullable: false})
    decimals!: number

    @IntColumn_({nullable: false})
    ss58!: number

    /**
     * target seconds per block, governance periods are counted in blocks
     */
    @IntColumn_({nullable: false})
    blockTime!: number

    @BigIntColumn_({nullable: false})
    existentialDeposit!: bigint

    /**
     * chain id the EVM side answers with
     */
    @IntColumn_({nullable: false})
    evmChainId!: number

    /**
     * blocks per session, boundaries land on multiples of it plus the offset
     */
    @IntColumn_({nullable: false})
    sessionLength!: number

    @IntColumn_({nullable: false})
    sessionOffset!: number

    /**
     * chain head the indexer last saw, not the indexed head
     */
    @IntColumn_({nullable: false})
    head!: number

    @IntColumn_({nullable: false})
    finalizedHead!: number
}
