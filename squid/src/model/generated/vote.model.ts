import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BooleanColumn as BooleanColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"
import {Account} from "./account.model"

@Entity_()
export class Vote {
    constructor(props?: Partial<Vote>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_vote_referendum_0f9860c6")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum>

    @Index_("idx_vote_voter_f6a67bf9")
    @ManyToOne_(() => Account, {nullable: true})
    voter!: Relation_<Account>

    /**
     * AccountVote variant, Standard, Split or SplitAbstain
     */
    @Index_("idx_vote_kind_e7675916")
    @StringColumn_({nullable: false})
    kind!: string

    /**
     * Standard only, the aye bit of the vote
     */
    @Index_("idx_vote_aye_04855396")
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

    @IntColumn_({nullable: false})
    block!: number

    @BooleanColumn_({nullable: false})
    removed!: boolean

    /**
     * the block the vote stops holding its balance, the end of a referendum it lost or
     * did not carry conviction into, the end plus the conviction periods on one it
     * won, or the block it came off an ongoing referendum. null while the referendum
     * is still ongoing and the vote stands
     */
    @IntColumn_({nullable: true})
    lockedUntil!: number | undefined | null

    /**
     * the block a VoteUnlocked on the vote's track freed it, its lock run out, the vote
     * gone from the account's voting record and the track's lock set to what that
     * record still asks for. remove_vote raises no event once the referendum is over,
     * and removed keeps saying whether the vote left the tally
     */
    @IntColumn_({nullable: true})
    unlockedAt!: number | undefined | null
}
