import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {Track} from "./track.model"

/**
 * append-only delegation action log, one row per Delegated or Undelegated event
 */
@Entity_()
export class DelegationAction {
    constructor(props?: Partial<DelegationAction>) {
        Object.assign(this, props)
    }

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
     * delegate or undelegate, an undelegate row keeps the delegation it removed
     */
    @StringColumn_({nullable: false})
    kind!: string

    @BigIntColumn_({nullable: false})
    balance!: bigint

    @StringColumn_({nullable: false})
    conviction!: string

    /**
     * conviction weighted sum delegated to the target after this action
     */
    @BigIntColumn_({nullable: false})
    delegatedVotes!: bigint

    @Index_("idx_delegation_action_block_5480dbe6")
    @IntColumn_({nullable: false})
    block!: number
}
