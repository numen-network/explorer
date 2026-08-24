import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, StringColumn as StringColumn_, ManyToOne as ManyToOne_, Relation as Relation_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

@Index_("idx_miner_day_stat_day_blocks_d35a091b", ["day", "blocks"], {unique: false})
@Entity_()
export class MinerDayStat {
    constructor(props?: Partial<MinerDayStat>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    day!: string

    @Index_("idx_miner_day_stat_account_d8161b0b")
    @ManyToOne_(() => Account, {nullable: true})
    account!: Relation_<Account>

    @IntColumn_({nullable: false})
    blocks!: number

    @BigIntColumn_({nullable: false})
    rewards!: bigint
}
