import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"
import {Account} from "./account.model"

@Entity_()
export class TreasurySpend {
    constructor(props?: Partial<TreasurySpend>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    /**
     * referendum whose enactment created this spend, matched by scheduler task
     */
    @Index_("idx_treasury_spend_referendum_f3bdda66")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum> | undefined | null

    /**
     * the Treasury call family, spend_local or spend
     */
    @StringColumn_({nullable: false})
    kind!: string

    @Index_("idx_treasury_spend_beneficiary_264a9618")
    @ManyToOne_(() => Account, {nullable: true})
    beneficiary!: Relation_<Account>

    @BigIntColumn_({nullable: false})
    amount!: bigint

    /**
     * method of the last Treasury event the spend raised
     */
    @Index_("idx_treasury_spend_status_607b4e2e")
    @StringColumn_({nullable: false})
    status!: string

    @IntColumn_({nullable: false})
    block!: number

    /**
     * indexInBlock of the event that approved the spend
     */
    @IntColumn_({nullable: false})
    indexInBlock!: number

    /**
     * first block a spend can be claimed at, spend_local has no window
     */
    @IntColumn_({nullable: true})
    validFrom!: number | undefined | null

    /**
     * block the claim window closes at
     */
    @IntColumn_({nullable: true})
    expireAt!: number | undefined | null

    /**
     * block of the last Paid event, which sets a payout apart from an expiry since both end in SpendProcessed
     */
    @IntColumn_({nullable: true})
    paidAt!: number | undefined | null

    /**
     * position of the spend call in the referendum's proposalCalls
     */
    @IntColumn_({nullable: true})
    proposalCall!: number | undefined | null
}
