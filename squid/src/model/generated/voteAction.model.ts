import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BooleanColumn as BooleanColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"
import {Account} from "./account.model"

/**
 * append-only voting action log, one row per Voted or VoteRemoved event
 */
@Entity_()
export class VoteAction {
    constructor(props?: Partial<VoteAction>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_vote_action_referendum_d7a46353")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum>

    @Index_("idx_vote_action_voter_af15c119")
    @ManyToOne_(() => Account, {nullable: true})
    voter!: Relation_<Account>

    /**
     * Voted or VoteRemoved, a remove row keeps the vote it took off the tally
     */
    @StringColumn_({nullable: false})
    method!: string

    /**
     * AccountVote variant, Standard, Split or SplitAbstain
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
     * the delegations on the voter's casting record at this block, as the chain keeps them
     */
    @BigIntColumn_({nullable: false})
    delegatedCapital!: bigint

    @BigIntColumn_({nullable: false})
    delegatedVotes!: bigint

    @Index_("idx_vote_action_block_42e0cf2c")
    @IntColumn_({nullable: false})
    block!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
