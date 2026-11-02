import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, StringColumn as StringColumn_, BooleanColumn as BooleanColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"
import {Account} from "./account.model"

/**
 * one row per event that changed a DelegatedVote, a vote of the target or a
 * delegation of the delegator
 */
@Index_("idx_delegated_vote_action_delegator_block_index_in_blo_f2683d8e", ["delegator", "block", "indexInBlock"], {unique: false})
@Entity_()
export class DelegatedVoteAction {
    constructor(props?: Partial<DelegatedVoteAction>) {
        Object.assign(this, props)
    }

    /**
     * the referendum index, the id of the event and the delegator, a vote event moves every delegation its voter holds
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_delegated_vote_action_referendum_59a703a5")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum>

    /**
     * the delegation target, whose standard vote carries the delegation
     */
    @Index_("idx_delegated_vote_action_voter_33c64953")
    @ManyToOne_(() => Account, {nullable: true})
    voter!: Relation_<Account>

    @ManyToOne_(() => Account, {nullable: true})
    delegator!: Relation_<Account>

    /**
     * Voted, VoteRemoved, Delegated or Undelegated
     */
    @StringColumn_({nullable: false})
    method!: string

    /**
     * the side of the standard vote that carries it
     */
    @BooleanColumn_({nullable: false})
    aye!: boolean

    /**
     * the Conviction variant name
     */
    @StringColumn_({nullable: false})
    conviction!: string

    @BigIntColumn_({nullable: false})
    balance!: bigint

    /**
     * the balance weighted by its conviction, a tenth of it for None and N times it for LockedNx
     */
    @BigIntColumn_({nullable: false})
    votes!: bigint

    /**
     * set when the event left the delegation not counting
     */
    @BooleanColumn_({nullable: false})
    removed!: boolean

    @IntColumn_({nullable: false})
    block!: number

    /**
     * the event's place in its block
     */
    @IntColumn_({nullable: false})
    indexInBlock!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
