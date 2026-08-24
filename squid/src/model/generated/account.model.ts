import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, Index as Index_, StringColumn as StringColumn_, JSONColumn as JSONColumn_, ManyToOne as ManyToOne_, Relation as Relation_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {IdentityStatus} from "./_identityStatus"

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
    frozen!: bigint

    @IntColumn_({nullable: false})
    nonce!: number

    @IntColumn_({nullable: false})
    firstSeenBlock!: number

    @Index_("idx_account_last_active_block_82d33d5a")
    @IntColumn_({nullable: false})
    lastActiveBlock!: number

    @Index_("idx_account_identity_display_842c1051")
    @StringColumn_({nullable: true})
    identityDisplay!: string | undefined | null

    @JSONColumn_({nullable: true})
    identityJson!: unknown | undefined | null

    /**
     * coarsens the judgement precedence the account badge uses, a flag from any registrar outranks approval from another
     */
    @Index_("idx_account_identity_status_8b941a81")
    @Column_("varchar", {length: 10, nullable: true})
    identityStatus!: IdentityStatus | undefined | null

    @StringColumn_({nullable: true})
    identitySubName!: string | undefined | null

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
     * typed holds on the reserved balance
     */
    @JSONColumn_({nullable: true})
    holdsJson!: unknown | undefined | null

    /**
     * plain reserves the chain records no reason for, each read back from the pallet that took it
     */
    @JSONColumn_({nullable: true})
    depositsJson!: unknown | undefined | null
}
