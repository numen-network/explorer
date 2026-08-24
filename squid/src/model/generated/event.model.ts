import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, IntColumn as IntColumn_, StringColumn as StringColumn_, JSONColumn as JSONColumn_} from "@subsquid/typeorm-store"
import {Block} from "./block.model"
import {Extrinsic} from "./extrinsic.model"
import {Call} from "./call.model"

@Entity_()
export class Event {
    constructor(props?: Partial<Event>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_event_block_26900bcf")
    @ManyToOne_(() => Block, {nullable: true})
    block!: Relation_<Block>

    @Index_("idx_event_extrinsic_297167ec")
    @ManyToOne_(() => Extrinsic, {nullable: true})
    extrinsic!: Relation_<Extrinsic> | undefined | null

    /**
     * the call that raised it, which for a batch is one of the subcalls
     */
    @Index_("idx_event_call_a1335fcb")
    @ManyToOne_(() => Call, {nullable: true})
    call!: Relation_<Call> | undefined | null

    @IntColumn_({nullable: false})
    indexInBlock!: number

    @StringColumn_({nullable: false})
    phase!: string

    @Index_("idx_event_pallet_97942426")
    @StringColumn_({nullable: false})
    pallet!: string

    @Index_("idx_event_method_ce4b1f83")
    @StringColumn_({nullable: false})
    method!: string

    @JSONColumn_({nullable: true})
    args!: unknown | undefined | null
}
