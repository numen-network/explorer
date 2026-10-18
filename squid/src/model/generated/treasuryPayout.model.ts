import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {TreasuryPayoutSource} from "./_treasuryPayoutSource"
import {TreasuryPayoutRole} from "./_treasuryPayoutRole"
import {TreasurySpend} from "./treasurySpend.model"
import {Bounty} from "./bounty.model"
import {ChildBounty} from "./childBounty.model"

/**
 * one row per treasury, bounty or child bounty payment an account received
 */
@Index_("idx_treasury_payout_account_id_17fa54bf", ["account", "id"], {unique: false})
@Entity_()
export class TreasuryPayout {
    constructor(props?: Partial<TreasuryPayout>) {
        Object.assign(this, props)
    }

    /**
     * id of the event that moved the money
     */
    @PrimaryColumn_()
    id!: string

    @ManyToOne_(() => Account, {nullable: true})
    account!: Relation_<Account>

    @Column_("varchar", {length: 11, nullable: false})
    source!: TreasuryPayoutSource

    @Column_("varchar", {length: 11, nullable: false})
    role!: TreasuryPayoutRole

    @Index_("idx_treasury_payout_spend_6869f5d4")
    @ManyToOne_(() => TreasurySpend, {nullable: true})
    spend!: Relation_<TreasurySpend> | undefined | null

    @Index_("idx_treasury_payout_bounty_d6fe0cad")
    @ManyToOne_(() => Bounty, {nullable: true})
    bounty!: Relation_<Bounty> | undefined | null

    @Index_("idx_treasury_payout_child_bounty_14ed5e84")
    @ManyToOne_(() => ChildBounty, {nullable: true})
    childBounty!: Relation_<ChildBounty> | undefined | null

    @BigIntColumn_({nullable: false})
    amount!: bigint

    @IntColumn_({nullable: false})
    block!: number
}
