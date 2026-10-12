import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_} from "@subsquid/typeorm-store"

/**
 * every pallet and method of an event the chain has actually raised, so an event picker offers real options
 */
@Entity_()
export class EventKind {
    constructor(props?: Partial<EventKind>) {
        Object.assign(this, props)
    }

    /**
     * pallet.method
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_event_kind_pallet_89b9010d")
    @StringColumn_({nullable: false})
    pallet!: string

    @StringColumn_({nullable: false})
    method!: string
}
