import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"

/**
 * an address that sent, received or created an EVM transaction, or sent or received a token
 */
@Entity_()
export class EvmAddress {
    constructor(props?: Partial<EvmAddress>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    /**
     * EVM transactions it sent, received or created
     */
    @IntColumn_({nullable: false})
    txCount!: number

    /**
     * earliest block holding one of its transactions or token transfers
     */
    @IntColumn_({nullable: false})
    firstSeenBlock!: number

    /**
     * latest block where it sent an EVM transaction, null if it never sent one
     */
    @IntColumn_({nullable: true})
    lastActiveBlock!: number | undefined | null
}
