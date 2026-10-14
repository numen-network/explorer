import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, OneToOne as OneToOne_, JoinColumn as JoinColumn_, Relation as Relation_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

/**
 * an account that delegations currently point to, one row while any do
 */
@Index_("idx_delegate_delegated_delegators_6a965d1e", ["delegated", "delegators"], {unique: false})
@Entity_()
export class Delegate {
    constructor(props?: Partial<Delegate>) {
        Object.assign(this, props)
    }

    /**
     * the account id
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_delegate_account_0ddc86fb", {unique: true})
    @OneToOne_(() => Account, {nullable: true})
    @JoinColumn_()
    account!: Relation_<Account>

    @IntColumn_({nullable: false})
    delegators!: number

    /**
     * how many tracks the delegations cover
     */
    @IntColumn_({nullable: false})
    tracks!: number

    /**
     * each delegator's largest balance across tracks, summed, since conviction locks overlap
     */
    @BigIntColumn_({nullable: false})
    delegated!: bigint
}
