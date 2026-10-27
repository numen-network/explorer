import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Delegate} from "./delegate.model"
import {Track} from "./track.model"

/**
 * what the delegations to a delegate add up to on one track
 */
@Entity_()
export class DelegateTrack {
    constructor(props?: Partial<DelegateTrack>) {
        Object.assign(this, props)
    }

    /**
     * the delegate and the track
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_delegate_track_delegate_a8f8c199")
    @ManyToOne_(() => Delegate, {nullable: true})
    delegate!: Relation_<Delegate>

    @Index_("idx_delegate_track_track_0e611b73")
    @ManyToOne_(() => Track, {nullable: true})
    track!: Relation_<Track>

    @IntColumn_({nullable: false})
    delegators!: number

    @BigIntColumn_({nullable: false})
    capital!: bigint

    @BigIntColumn_({nullable: false})
    votes!: bigint
}
