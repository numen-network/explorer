import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

@Entity_()
export class UsernameAuthority {
    constructor(props?: Partial<UsernameAuthority>) {
        Object.assign(this, props)
    }

    /**
     * the suffix the authority grants usernames under
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_username_authority_account_7941a8d4")
    @ManyToOne_(() => Account, {nullable: true})
    account!: Relation_<Account>

    /**
     * usernames it can still grant without a deposit
     */
    @IntColumn_({nullable: false})
    allocation!: number

    /**
     * its usernames that are active or unbinding
     */
    @IntColumn_({nullable: false})
    usernameCount!: number

    /**
     * block of the AuthorityAdded that brought the suffix in, null for a suffix the chain started with
     */
    @IntColumn_({nullable: true})
    addedBlock!: number | undefined | null

    @DateTimeColumn_({nullable: true})
    addedAt!: Date | undefined | null
}
