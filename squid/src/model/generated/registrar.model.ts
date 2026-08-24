import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

@Entity_()
export class Registrar {
    constructor(props?: Partial<Registrar>) {
        Object.assign(this, props)
    }

    /**
     * the index into the registrar list, which is what judgements point at
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_registrar_index_bbf235ee", {unique: true})
    @IntColumn_({nullable: false})
    index!: number

    @Index_("idx_registrar_account_c70e5df6")
    @ManyToOne_(() => Account, {nullable: true})
    account!: Relation_<Account> | undefined | null

    @BigIntColumn_({nullable: false})
    fee!: bigint

    @BigIntColumn_({nullable: false})
    fields!: bigint

    @IntColumn_({nullable: false})
    addedAt!: number

    @IntColumn_({nullable: false})
    requestCount!: number

    @IntColumn_({nullable: false})
    givenCount!: number

    @IntColumn_({nullable: true})
    lastJudgementBlock!: number | undefined | null

    @DateTimeColumn_({nullable: true})
    lastJudgementAt!: Date | undefined | null
}
