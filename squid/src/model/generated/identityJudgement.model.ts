import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {Registrar} from "./registrar.model"
import {Event} from "./event.model"

/**
 * one entry of a registration's judgements as storage holds it now, FeePaid while the request waits for the registrar
 */
@Index_("idx_identity_judgement_registrar_block_9bac1fe2", ["registrar", "block"], {unique: false})
@Index_("idx_identity_judgement_kind_block_ad656824", ["kind", "block"], {unique: false})
@Entity_()
export class IdentityJudgement {
    constructor(props?: Partial<IdentityJudgement>) {
        Object.assign(this, props)
    }

    /**
     * the account id and the registrar index
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_identity_judgement_account_2ac5e857")
    @ManyToOne_(() => Account, {nullable: true})
    account!: Relation_<Account>

    @ManyToOne_(() => Registrar, {nullable: true})
    registrar!: Relation_<Registrar>

    @StringColumn_({nullable: false})
    kind!: string

    /**
     * only a FeePaid entry carries one, the fee held for the registrar
     */
    @BigIntColumn_({nullable: true})
    fee!: bigint | undefined | null

    /**
     * the JudgementRequested or JudgementGiven that wrote the entry
     */
    @Index_("idx_identity_judgement_event_9b4aacf7")
    @ManyToOne_(() => Event, {nullable: true})
    event!: Relation_<Event>

    @IntColumn_({nullable: false})
    block!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
