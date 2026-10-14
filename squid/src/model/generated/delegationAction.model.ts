import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {Track} from "./track.model"

/**
 * append-only delegation log, one row per Delegated or Undelegated event
 */
@Entity_()
export class DelegationAction {
    constructor(props?: Partial<DelegationAction>) {
        Object.assign(this, props)
    }

    /**
     * the id of the event
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_delegation_action_who_69072ee4")
    @ManyToOne_(() => Account, {nullable: true})
    who!: Relation_<Account>

    @Index_("idx_delegation_action_target_e94904f8")
    @ManyToOne_(() => Account, {nullable: true})
    target!: Relation_<Account>

    @Index_("idx_delegation_action_track_ffb96758")
    @ManyToOne_(() => Track, {nullable: true})
    track!: Relation_<Track>

    /**
     * Delegated or Undelegated
     */
    @StringColumn_({nullable: false})
    method!: string

    /**
     * the Conviction variant name of the delegation the event set up or ended, null when the same block set it up and undid it
     */
    @StringColumn_({nullable: true})
    conviction!: string | undefined | null

    @BigIntColumn_({nullable: true})
    balance!: bigint | undefined | null

    @IntColumn_({nullable: false})
    block!: number

    /**
     * position of the event in its block
     */
    @IntColumn_({nullable: false})
    indexInBlock!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
