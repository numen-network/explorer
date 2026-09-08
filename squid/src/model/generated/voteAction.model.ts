import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
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
     * vote or remove, a remove row keeps the vote it took off the tally
     */
    @StringColumn_({nullable: false})
    kind!: string

    @StringColumn_({nullable: false})
    decision!: string

    @BigIntColumn_({nullable: false})
    amount!: bigint

    /**
     * the amount weighted by conviction, delegations come on top
     */
    @BigIntColumn_({nullable: false})
    votes!: bigint

    @StringColumn_({nullable: true})
    conviction!: string | undefined | null

    /**
     * capital delegated to the voter at this block, zero for split and abstain votes
     */
    @BigIntColumn_({nullable: false})
    delegatedCapital!: bigint

    /**
     * conviction weighted sum of the same delegations, the vote carries this weight onto the tally
     */
    @BigIntColumn_({nullable: false})
    delegatedVotes!: bigint

    @Index_("idx_vote_action_block_42e0cf2c")
    @IntColumn_({nullable: false})
    block!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
