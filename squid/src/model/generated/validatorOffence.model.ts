import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Validator} from "./validator.model"

/**
 * one row per validator an ImOnline.SomeOffline names and one per Validator.EquivocationReported
 */
@Entity_()
export class ValidatorOffence {
    constructor(props?: Partial<ValidatorOffence>) {
        Object.assign(this, props)
    }

    /**
     * the event id, with the validator after it on an Offline row
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_validator_offence_validator_88b118f2")
    @ManyToOne_(() => Validator, {nullable: true})
    validator!: Relation_<Validator>

    /**
     * Offline or Equivocation
     */
    @StringColumn_({nullable: false})
    kind!: string

    @IntColumn_({nullable: false})
    block!: number

    @Index_("idx_validator_offence_timestamp_d93e74a3")
    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
