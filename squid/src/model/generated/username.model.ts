import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, BooleanColumn as BooleanColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

/**
 * a username from the moment its authority grants it until the chain drops it
 */
@Entity_()
export class Username {
    constructor(props?: Partial<Username>) {
        Object.assign(this, props)
    }

    /**
     * the full username, suffix included
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_username_owner_1ca1de2a")
    @ManyToOne_(() => Account, {nullable: true})
    owner!: Relation_<Account>

    @Index_("idx_username_suffix_7e01e684")
    @StringColumn_({nullable: false})
    suffix!: string

    /**
     * Pending while it waits in PendingUsernames, Unbinding while UnbindingUsernames holds it, Active otherwise
     */
    @Index_("idx_username_status_10cd64a1")
    @StringColumn_({nullable: false})
    status!: string

    /**
     * block a pending username lapses at, or the first block an unbinding one can be removed at
     */
    @IntColumn_({nullable: true})
    expiresAt!: number | undefined | null

    /**
     * the Provider variant name
     */
    @StringColumn_({nullable: false})
    provider!: string

    /**
     * what the authority reserved for an AuthorityDeposit username
     */
    @BigIntColumn_({nullable: true})
    deposit!: bigint | undefined | null

    /**
     * whether it is the name UsernameOf maps its owner to
     */
    @BooleanColumn_({nullable: false})
    primary!: boolean

    /**
     * block of the UsernameQueued or UsernameSet that granted it
     */
    @Index_("idx_username_granted_block_beb51ac7")
    @IntColumn_({nullable: false})
    grantedBlock!: number

    @DateTimeColumn_({nullable: false})
    grantedAt!: Date
}
