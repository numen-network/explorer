import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, DateTimeColumn as DateTimeColumn_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import {Event} from "./event.model"

/**
 * one row per session from genesis on, a boundary block's events before its NewSession count toward the session it closes
 */
@Entity_()
export class Session {
    constructor(props?: Partial<Session>) {
        Object.assign(this, props)
    }

    /**
     * the session index
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_session_index_be5ad0a6", {unique: true})
    @IntColumn_({nullable: false})
    index!: number

    /**
     * 0 for the genesis session
     */
    @IntColumn_({nullable: false})
    startBlock!: number

    /**
     * the NewSession that started it, null for the genesis session
     */
    @Index_("idx_session_start_event_579841d5")
    @ManyToOne_(() => Event, {nullable: true})
    startEvent!: Relation_<Event> | undefined | null

    /**
     * null for the genesis session, genesis has no timestamp inherent
     */
    @DateTimeColumn_({nullable: true})
    timestamp!: Date | undefined | null

    /**
     * the block before the next session starts, null while it runs
     */
    @IntColumn_({nullable: true})
    endBlock!: number | undefined | null

    /**
     * Session.Validators as its first block left it
     */
    @StringColumn_({array: true, nullable: false})
    validators!: (string)[]

    /**
     * the size of validators
     */
    @IntColumn_({nullable: false})
    validatorCount!: number

    /**
     * validators the ImOnline.SomeOffline at its end names
     */
    @IntColumn_({nullable: false})
    offline!: number

    /**
     * Validator.EquivocationReported events raised in it
     */
    @IntColumn_({nullable: false})
    equivocations!: number

    /**
     * Validator.ValidatorKicked events raised in it
     */
    @IntColumn_({nullable: false})
    kicked!: number
}
