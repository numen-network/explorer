import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class Token {
    constructor(props?: Partial<Token>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: true})
    name!: string | undefined | null

    @Index_("idx_token_symbol_0d3c74d6")
    @StringColumn_({nullable: true})
    symbol!: string | undefined | null

    @IntColumn_({nullable: true})
    decimals!: number | undefined | null

    @BigIntColumn_({nullable: false})
    totalSupply!: bigint

    @IntColumn_({nullable: false})
    holderCount!: number

    @IntColumn_({nullable: false})
    transferCount!: number

    /**
     * block the create tx landed in, absent for factory built contracts and for deployments older than the index range
     */
    @IntColumn_({nullable: true})
    deployBlock!: number | undefined | null

    /**
     * block the first transfer landed in, the earliest the token can be known without a create tx
     */
    @IntColumn_({nullable: false})
    firstBlock!: number
}
