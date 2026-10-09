import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, BooleanColumn as BooleanColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"
import {Account} from "./account.model"

/**
 * a delegation a referendum counts through the standard vote its target holds
 * there, left as it stood when the referendum ended
 */
@Entity_()
export class DelegatedVote {
    constructor(props?: Partial<DelegatedVote>) {
        Object.assign(this, props)
    }

    /**
     * the referendum index and the delegator
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_delegated_vote_referendum_8f56d407")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum>

    /**
     * the delegation target, whose standard vote carries the delegation
     */
    @Index_("idx_delegated_vote_voter_29698af1")
    @ManyToOne_(() => Account, {nullable: true})
    voter!: Relation_<Account>

    @Index_("idx_delegated_vote_delegator_183883b0")
    @ManyToOne_(() => Account, {nullable: true})
    delegator!: Relation_<Account>

    /**
     * the Conviction variant name
     */
    @StringColumn_({nullable: false})
    conviction!: string

    @BigIntColumn_({nullable: false})
    balance!: bigint

    /**
     * set while the delegation does not count, its target's vote taken off or split or the delegation undone
     */
    @BooleanColumn_({nullable: false})
    removed!: boolean

    @IntColumn_({nullable: false})
    block!: number
}
