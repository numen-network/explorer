import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_, Index as Index_, StringColumn as StringColumn_, JSONColumn as JSONColumn_, ManyToOne as ManyToOne_, Relation as Relation_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"

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

    @IntColumn_({nullable: false})
    nonce!: number

    @IntColumn_({nullable: false})
    firstSeenBlock!: number

    @Index_("idx_account_first_seen_timestamp_00087e2f")
    @DateTimeColumn_({nullable: false})
    firstSeenTimestamp!: Date

    @Index_("idx_account_last_active_block_82d33d5a")
    @IntColumn_({nullable: false})
    lastActiveBlock!: number

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

    /**
     * primary username granted through a username authority
     */
    @Index_("idx_account_username_e1e37d55")
    @StringColumn_({nullable: true})
    username!: string | undefined | null

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
}
