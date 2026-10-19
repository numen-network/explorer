import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToOne as OneToOne_, Index as Index_, JoinColumn as JoinColumn_, Relation as Relation_, IntColumn as IntColumn_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

/**
 * a multisig account, one row once it opened an operation
 */
@Entity_()
export class Multisig {
    constructor(props?: Partial<Multisig>) {
        Object.assign(this, props)
    }

    /**
     * the account id
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_multisig_account_65253f89", {unique: true})
    @OneToOne_(() => Account, {nullable: true})
    @JoinColumn_()
    account!: Relation_<Account>

    @IntColumn_({nullable: false})
    threshold!: number

    /**
     * sorted signer set
     */
    @StringColumn_({array: true, nullable: false})
    signatories!: (string)[]

    /**
     * operations still collecting approvals
     */
    @IntColumn_({nullable: false})
    pending!: number

    @IntColumn_({nullable: false})
    operations!: number

    @Index_("idx_multisig_last_active_block_9e2ba6f9")
    @IntColumn_({nullable: false})
    lastActiveBlock!: number
}
