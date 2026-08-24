import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Registrar} from "./registrar.model"
import {Account} from "./account.model"

@Index_("idx_judgement_registrar_block_c7e4ceff", ["registrar", "block"], {unique: false})
@Entity_()
export class Judgement {
    constructor(props?: Partial<Judgement>) {
        Object.assign(this, props)
    }

    /**
     * the id of the JudgementGiven event that recorded it
     */
    @PrimaryColumn_()
    id!: string

    @ManyToOne_(() => Registrar, {nullable: true})
    registrar!: Relation_<Registrar>

    @Index_("idx_judgement_target_52d06aef")
    @ManyToOne_(() => Account, {nullable: true})
    target!: Relation_<Account>

    /**
     * the verdict read back from storage right after the event, absent when the same batch cleared the identity
     */
    @StringColumn_({nullable: true})
    kind!: string | undefined | null

    /**
     * only a FeePaid verdict carries one, it is the amount the registrar was paid up front
     */
    @BigIntColumn_({nullable: true})
    fee!: bigint | undefined | null

    @Index_("idx_judgement_block_e9143e28")
    @IntColumn_({nullable: false})
    block!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
