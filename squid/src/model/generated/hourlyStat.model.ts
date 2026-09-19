import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, DateTimeColumn as DateTimeColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Block} from "./block.model"

@Entity_()
export class HourlyStat {
    constructor(props?: Partial<HourlyStat>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_hourly_stat_hour_8c7d2a38")
    @DateTimeColumn_({nullable: false})
    hour!: Date

    @Index_("idx_hourly_stat_block_0db9c5b8")
    @ManyToOne_(() => Block, {nullable: true})
    block!: Relation_<Block>

    /**
     * every account's transferable balance summed at the hour's last block, inactive issuance included
     */
    @BigIntColumn_({nullable: false})
    issuanceTransferable!: bigint

    @BigIntColumn_({nullable: false})
    issuanceInactive!: bigint
}
