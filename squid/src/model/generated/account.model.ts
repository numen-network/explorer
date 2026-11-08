import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_, Index as Index_, StringColumn as StringColumn_, JSONColumn as JSONColumn_, ManyToOne as ManyToOne_, Relation as Relation_, OneToMany as OneToMany_, OneToOne as OneToOne_} from "@subsquid/typeorm-store"
import {Delegate} from "./delegate.model"
import {Referendum} from "./referendum.model"

@Entity_()
export class Account {
    constructor(props?: Partial<Account>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @BigIntColumn_({nullable: false})
    free!: bigint

    @BigIntColumn_({nullable: false})
    reserved!: bigint

    @BigIntColumn_({nullable: false})
    balance!: bigint

    @BigIntColumn_({nullable: false})
    frozen!: bigint

    /**
     * how much transfer_allow_death can move, the way Balances::reducible_balance counts it
     */
    @BigIntColumn_({nullable: false})
    transferable!: bigint

    @IntColumn_({nullable: false})
    nonce!: number

    @IntColumn_({nullable: false})
    firstSeenBlock!: number

    /**
     * timestamp of the first seen block, null for an account born at genesis
     */
    @Index_("idx_account_first_seen_timestamp_00087e2f")
    @DateTimeColumn_({nullable: true})
    firstSeenTimestamp!: Date | undefined | null

    /**
     * null for an account that never signed or dispatched anything
     */
    @Index_("idx_account_last_active_block_82d33d5a")
    @IntColumn_({nullable: true})
    lastActiveBlock!: number | undefined | null

    /**
     * when this account last sealed a block
     */
    @Index_("idx_account_last_mined_timestamp_f3118da7")
    @DateTimeColumn_({nullable: true})
    lastMinedTimestamp!: Date | undefined | null

    @Index_("idx_account_identity_display_842c1051")
    @StringColumn_({nullable: true})
    identityDisplay!: string | undefined | null

    @JSONColumn_({nullable: true})
    identityJson!: unknown | undefined | null

    /**
     * judgement badge from 0 to 3 as verified, out of date, unjudged and flagged, null without a registration
     */
    @IntColumn_({nullable: true})
    identityRank!: number | undefined | null

    /**
     * the IdentitySet that turned this registration on, later edits keep it
     */
    @IntColumn_({nullable: true})
    identitySetBlock!: number | undefined | null

    /**
     * the sub name as readable text, only a Raw Data variant decodes to one
     */
    @StringColumn_({nullable: true})
    identitySubName!: string | undefined | null

    /**
     * the Data the super filed for this sub, whole
     */
    @JSONColumn_({nullable: true})
    identitySubData!: unknown | undefined | null

    @Index_("idx_account_identity_super_6eb9fc9a")
    @ManyToOne_(() => Account, {nullable: true})
    identitySuper!: Relation_<Account> | undefined | null

    @OneToMany_(() => Account, e => e.identitySuper)
    subs!: Relation_<Account[]>

    @OneToOne_(() => Delegate, e => e.account)
    delegate!: Relation_<Delegate> | undefined | null

    /**
     * primary username granted through a username authority
     */
    @Index_("idx_account_username_e1e37d55")
    @StringColumn_({nullable: true})
    username!: string | undefined | null

    /**
     * the H160 that maps to this account under the runtime of the block it was last read at. Frontier hashes one way, so the H160 is known only once it sends a transaction. Revive maps both ways, so every account the mapping leads back to has one
     */
    @Index_("idx_account_evm_address_66f5172b")
    @StringColumn_({nullable: true})
    evmAddress!: string | undefined | null

    @JSONColumn_({nullable: true})
    vestingJson!: unknown | undefined | null

    /**
     * balance locks with the lock id decoded from its eight bytes
     */
    @JSONColumn_({nullable: true})
    locksJson!: unknown | undefined | null

    /**
     * holds on the reserved balance, each with its RuntimeHoldReason whole
     */
    @JSONColumn_({nullable: true})
    holdsJson!: unknown | undefined | null

    /**
     * plain reserves the chain records no reason for, each read back from the pallet that took it
     */
    @JSONColumn_({nullable: true})
    depositsJson!: unknown | undefined | null

    /**
     * native transfers in and out, summed since genesis
     */
    @BigIntColumn_({nullable: false})
    transferInVolume!: bigint

    @BigIntColumn_({nullable: false})
    transferOutVolume!: bigint

    /**
     * blocks it sealed
     */
    @IntColumn_({nullable: false})
    minedBlocks!: number

    /**
     * minted for the blocks it sealed
     */
    @BigIntColumn_({nullable: false})
    minedRewards!: bigint

    /**
     * fee share and tips from the blocks it sealed
     */
    @BigIntColumn_({nullable: false})
    minedFees!: bigint

    /**
     * treasury spends paid to it
     */
    @BigIntColumn_({nullable: false})
    spendsReceived!: bigint

    /**
     * bounty payouts it received as beneficiary
     */
    @BigIntColumn_({nullable: false})
    bountiesReceived!: bigint

    /**
     * child bounty payouts it received as beneficiary
     */
    @BigIntColumn_({nullable: false})
    childBountiesReceived!: bigint

    /**
     * curator fees from bounties and child bounties
     */
    @BigIntColumn_({nullable: false})
    curatorFeesReceived!: bigint

    /**
     * the conviction weighted votes of its standing vote on every referendum, whatever the outcome
     */
    @BigIntColumn_({nullable: false})
    ownVotes!: bigint

    /**
     * the conviction weighted votes others delegated through its standing votes, referendum by referendum
     */
    @BigIntColumn_({nullable: false})
    receivedVotes!: bigint

    /**
     * the conviction weighted votes it delegated through others' standing votes, referendum by referendum
     */
    @BigIntColumn_({nullable: false})
    delegatedVotes!: bigint

    /**
     * ownVotes, receivedVotes and delegatedVotes together
     */
    @Index_("idx_account_total_votes_30338453")
    @BigIntColumn_({nullable: false})
    totalVotes!: bigint

    /**
     * the referenda it holds a standing vote on
     */
    @IntColumn_({nullable: false})
    directReferenda!: number

    /**
     * the referenda that count its delegation through a standing vote of its target
     */
    @IntColumn_({nullable: false})
    delegatedReferenda!: number

    /**
     * the referendum of its latest standing vote, direct or delegated. a tie in one block goes to the higher index
     */
    @Index_("idx_account_last_vote_58859857")
    @ManyToOne_(() => Referendum, {nullable: true})
    lastVote!: Relation_<Referendum> | undefined | null
}
