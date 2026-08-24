import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, DateTimeColumn as DateTimeColumn_, Index as Index_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class DailyStat {
    constructor(props?: Partial<DailyStat>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_daily_stat_date_7855a7bd")
    @DateTimeColumn_({nullable: false})
    date!: Date

    @IntColumn_({nullable: false})
    blocks!: number

    @IntColumn_({nullable: false})
    extrinsicsSigned!: number

    @IntColumn_({nullable: false})
    transfers!: number

    @BigIntColumn_({nullable: false})
    transferVolume!: bigint

    @IntColumn_({nullable: false})
    evmTxs!: number

    @BigIntColumn_({nullable: false})
    fees!: bigint

    @DateTimeColumn_({nullable: false})
    tsFirst!: Date

    @DateTimeColumn_({nullable: false})
    tsLast!: Date

    @BigIntColumn_({nullable: false})
    difficultyClose!: bigint

    @BigIntColumn_({nullable: false})
    issuanceTotal!: bigint

    @BigIntColumn_({nullable: false})
    issuanceInactive!: bigint

    @BigIntColumn_({nullable: false})
    treasuryPot!: bigint

    @BigIntColumn_({nullable: false})
    cumExtrinsicsSigned!: bigint

    @BigIntColumn_({nullable: false})
    cumTransfers!: bigint

    @BigIntColumn_({nullable: false})
    cumTransferVolume!: bigint

    /**
     * accounts the chain had seen by the end of the day
     */
    @IntColumn_({nullable: false})
    accountsTotal!: number

    /**
     * referenda submitted by the end of the day
     */
    @IntColumn_({nullable: false})
    referendaTotal!: number
}
