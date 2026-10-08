import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, StringColumn as StringColumn_, BooleanColumn as BooleanColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"
import {Account} from "./account.model"

/**
 * one row per vote cast or removed on a referendum, and one per delegation
 * change that moved its tally through the standard vote its target held
 */
@Index_("idx_voting_action_referendum_block_index_in_block_be38d6ea", ["referendum", "block", "indexInBlock"], {unique: false})
@Entity_()
export class VotingAction {
    constructor(props?: Partial<VotingAction>) {
        Object.assign(this, props)
    }

    /**
     * the referendum index and the id of the event, a delegation event moves every referendum its target voted on
     */
    @PrimaryColumn_()
    id!: string

    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum>

    /**
     * whose vote the row moves, the delegation target on a delegation row
     */
    @Index_("idx_voting_action_voter_245e640a")
    @ManyToOne_(() => Account, {nullable: true})
    voter!: Relation_<Account>

    /**
     * the account delegating or undelegating, null on a vote row
     */
    @Index_("idx_voting_action_delegator_3140b673")
    @ManyToOne_(() => Account, {nullable: true})
    delegator!: Relation_<Account> | undefined | null

    /**
     * Voted, VoteRemoved, Delegated or Undelegated
     */
    @StringColumn_({nullable: false})
    method!: string

    /**
     * AccountVote variant, Standard, Split or SplitAbstain, a remove row keeps the vote it took off the tally and a delegation row the standard vote of its target
     */
    @StringColumn_({nullable: false})
    kind!: string

    /**
     * Standard only, the aye bit of the vote
     */
    @BooleanColumn_({nullable: true})
    aye!: boolean | undefined | null

    /**
     * Standard only, the Conviction variant name
     */
    @StringColumn_({nullable: true})
    conviction!: string | undefined | null

    /**
     * Standard only
     */
    @BigIntColumn_({nullable: true})
    balance!: bigint | undefined | null

    /**
     * Split and SplitAbstain parts
     */
    @BigIntColumn_({nullable: true})
    ayeAmount!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    nayAmount!: bigint | undefined | null

    /**
     * SplitAbstain only
     */
    @BigIntColumn_({nullable: true})
    abstainAmount!: bigint | undefined | null

    /**
     * conviction weighted sum of the delegations on the voter's casting record at the end of the block, as the chain keeps it
     */
    @BigIntColumn_({nullable: false})
    delegatedVotes!: bigint

    /**
     * how far the block moved the approval, approvalPart over approvalWhole, read off the tally snapshots and set on the referendum's last row in the block only
     */
    @BigIntColumn_({nullable: true})
    approvalPart!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    approvalWhole!: bigint | undefined | null

    /**
     * the support the block added or took away, supportWhole is the active issuance at its end
     */
    @BigIntColumn_({nullable: true})
    supportPart!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    supportWhole!: bigint | undefined | null

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
