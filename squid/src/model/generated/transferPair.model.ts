import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

/**
 * an account's native transfers with one counterparty, summed since genesis
 */
@Index_("idx_transfer_pair_account_amount_in_1d76b984", ["account", "amountIn"], {unique: false})
@Index_("idx_transfer_pair_account_count_in_00fd0c8c", ["account", "countIn"], {unique: false})
@Index_("idx_transfer_pair_account_amount_out_c74c2e7a", ["account", "amountOut"], {unique: false})
@Index_("idx_transfer_pair_account_count_out_6e077e02", ["account", "countOut"], {unique: false})
@Entity_()
export class TransferPair {
    constructor(props?: Partial<TransferPair>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @ManyToOne_(() => Account, {nullable: true})
    account!: Relation_<Account>

    @Index_("idx_transfer_pair_counterparty_b0f627b8")
    @ManyToOne_(() => Account, {nullable: true})
    counterparty!: Relation_<Account>

    @BigIntColumn_({nullable: false})
    amountIn!: bigint

    @IntColumn_({nullable: false})
    countIn!: number

    @BigIntColumn_({nullable: false})
    amountOut!: bigint

    @IntColumn_({nullable: false})
    countOut!: number

    @IntColumn_({nullable: false})
    firstBlock!: number

    @IntColumn_({nullable: false})
    lastBlock!: number
}
