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

    /**
     * what the contract answered to totalSupply at the last block that moved it, null when it answered nothing
     */
    @BigIntColumn_({nullable: true})
    totalSupply!: bigint | undefined | null

    /**
     * holders whose last balanceOf answer was above zero
     */
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
     * sender of the create tx, absent for factory built contracts and for deployments older than the index range
     */
    @Index_("idx_token_deployer_388fb311")
    @StringColumn_({nullable: true})
    deployer!: string | undefined | null

    /**
     * block the first transfer landed in, the earliest the token can be known without a create tx
     */
    @IntColumn_({nullable: false})
    firstBlock!: number

    /**
     * the first of the two tokens a Uniswap V2 style pair pools, as its token0() answered, absent for any other token
     */
    @StringColumn_({nullable: true})
    token0!: string | undefined | null

    /**
     * the second, as its token1() answered
     */
    @StringColumn_({nullable: true})
    token1!: string | undefined | null

    /**
     * what token0 answered to symbol(), absent when it answered nothing
     */
    @StringColumn_({nullable: true})
    token0Symbol!: string | undefined | null

    /**
     * what token1 answered to symbol(), absent when it answered nothing
     */
    @StringColumn_({nullable: true})
    token1Symbol!: string | undefined | null
}
