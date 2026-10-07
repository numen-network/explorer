import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, JSONColumn as JSONColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class Track {
    constructor(props?: Partial<Track>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    /**
     * the TrackId as a number, id holds it as a string
     */
    @Index_("idx_track_index_ef7c4ac1", {unique: true})
    @IntColumn_({nullable: false})
    index!: number

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
