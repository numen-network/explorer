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

    @StringColumn_({nullable: false})
    kind!: string

    @Index_("idx_treasury_spend_beneficiary_264a9618")
    @ManyToOne_(() => Account, {nullable: true})
    beneficiary!: Relation_<Account> | undefined | null

    @BigIntColumn_({nullable: false})
    amount!: bigint

    @Index_("idx_treasury_spend_status_607b4e2e")
    @StringColumn_({nullable: false})
    status!: string

    @IntColumn_({nullable: false})
    block!: number
}
