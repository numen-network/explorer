import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, JSONColumn as JSONColumn_} from "@subsquid/typeorm-store"
import {Track} from "./track.model"
import {RuntimeVersion} from "./runtimeVersion.model"

/**
 * a track as one runtime version defines it
 */
@Entity_()
export class TrackParams {
    constructor(props?: Partial<TrackParams>) {
        Object.assign(this, props)
    }

    /**
     * track index and spec version joined by a dash
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_track_params_track_4f0fa300")
    @ManyToOne_(() => Track, {nullable: true})
    track!: Relation_<Track>

    @Index_("idx_track_params_runtime_d4237aba")
    @ManyToOne_(() => RuntimeVersion, {nullable: true})
    runtime!: Relation_<RuntimeVersion>

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
