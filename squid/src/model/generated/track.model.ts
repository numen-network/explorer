import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, JSONColumn as JSONColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class Track {
    constructor(props?: Partial<Track>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    name!: string

    @IntColumn_({nullable: false})
    maxDeciding!: number

    /**
     * ceiling the track origin can approve, set by pallet_custom_origins, absent on tracks that release no funds
     */
    @BigIntColumn_({nullable: true})
    maxSpend!: bigint | undefined | null

    @BigIntColumn_({nullable: false})
    decisionDeposit!: bigint

    @IntColumn_({nullable: false})
    preparePeriod!: number

    @IntColumn_({nullable: false})
    decisionPeriod!: number

    @IntColumn_({nullable: false})
    confirmPeriod!: number

    @IntColumn_({nullable: false})
    minEnactmentPeriod!: number

    /**
     * pallet_referenda Curve as the runtime constant carries it, Perbill and FixedI64 fields count in billionths
     */
    @JSONColumn_({nullable: false})
    minApproval!: unknown

    @JSONColumn_({nullable: false})
    minSupport!: unknown
}
