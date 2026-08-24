import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_} from "@subsquid/typeorm-store"

/**
 * every pallet and method the chain has actually seen, so a call picker offers real options instead of a hardcoded list
 */
@Entity_()
export class CallKind {
    constructor(props?: Partial<CallKind>) {
        Object.assign(this, props)
    }

    /**
     * pallet.method
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_call_kind_pallet_97f22f04")
    @StringColumn_({nullable: false})
    pallet!: string

    @StringColumn_({nullable: false})
    method!: string
}
