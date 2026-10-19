import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, StringColumn as StringColumn_, ManyToOne as ManyToOne_, Relation as Relation_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

/**
 * one account's day, written only for a day a block touched it
 */
@Index_("idx_account_day_account_day_ad028897", ["account", "day"], {unique: false})
@Entity_()
export class AccountDay {
    constructor(props?: Partial<AccountDay>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    day!: string

    @ManyToOne_(() => Account, {nullable: true})
    account!: Relation_<Account>

    /**
     * balance data at the day's last block
     */
    @BigIntColumn_({nullable: false})
    free!: bigint

    @BigIntColumn_({nullable: false})
    reserved!: bigint

    @BigIntColumn_({nullable: false})
    frozen!: bigint

    /**
     * signed extrinsics
     */
    @IntColumn_({nullable: false})
    extrinsics!: number

    @IntColumn_({nullable: false})
    transfersIn!: number

    @IntColumn_({nullable: false})
    transfersOut!: number

    /**
     * fees this account paid, split the way the chain deposited them
     */
    @BigIntColumn_({nullable: false})
    feeTreasury!: bigint

    @BigIntColumn_({nullable: false})
    feeMiner!: bigint

    @BigIntColumn_({nullable: false})
    tip!: bigint
}
