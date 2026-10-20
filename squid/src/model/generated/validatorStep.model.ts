import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {Event} from "./event.model"

/**
 * one row per Validator event naming an account, with each run of auto-renewals in a row folded into one
 */
@Entity_()
export class ValidatorStep {
    constructor(props?: Partial<ValidatorStep>) {
        Object.assign(this, props)
    }

    /**
     * the id of its first event
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_validator_step_account_e7f7ffe7")
    @ManyToOne_(() => Account, {nullable: true})
    account!: Relation_<Account>

    @Index_("idx_validator_step_event_63f17947")
    @ManyToOne_(() => Event, {nullable: true})
    event!: Relation_<Event>

    /**
     * the latest renewal of a run, the step's own event otherwise
     */
    @Index_("idx_validator_step_last_event_77b1682e")
    @ManyToOne_(() => Event, {nullable: true})
    lastEvent!: Relation_<Event>

    /**
     * the auto-renewals a run folds, 0 on any other step
     */
    @IntColumn_({nullable: false})
    renewals!: number
}
