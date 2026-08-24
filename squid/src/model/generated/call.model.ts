import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, IntColumn as IntColumn_, OneToMany as OneToMany_, StringColumn as StringColumn_, JSONColumn as JSONColumn_, BooleanColumn as BooleanColumn_} from "@subsquid/typeorm-store"
import {Extrinsic} from "./extrinsic.model"
import {Block} from "./block.model"
import {Account} from "./account.model"
import {Event} from "./event.model"

/**
 * one node of an extrinsic call tree, the root included
 */
@Entity_()
export class Call {
    constructor(props?: Partial<Call>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_call_extrinsic_83bd0b4e")
    @ManyToOne_(() => Extrinsic, {nullable: true})
    extrinsic!: Relation_<Extrinsic>

    @Index_("idx_call_block_8f3ca806")
    @ManyToOne_(() => Block, {nullable: true})
    block!: Relation_<Block>

    /**
     * path of subcall indexes down from the root, empty at the root
     */
    @IntColumn_({array: true, nullable: false})
    address!: (number)[]

    @Index_("idx_call_parent_d9400c51")
    @ManyToOne_(() => Call, {nullable: true})
    parent!: Relation_<Call> | undefined | null

    @OneToMany_(() => Call, e => e.parent)
    subcalls!: Relation_<Call[]>

    @Index_("idx_call_pallet_7d7fb025")
    @StringColumn_({nullable: false})
    pallet!: string

    @Index_("idx_call_method_235f10f9")
    @StringColumn_({nullable: false})
    method!: string

    @JSONColumn_({nullable: true})
    args!: unknown | undefined | null

    @BooleanColumn_({nullable: false})
    success!: boolean

    /**
     * who the call dispatches as, which proxy and multisig move away from the signer
     */
    @Index_("idx_call_origin_6f603f05")
    @ManyToOne_(() => Account, {nullable: true})
    origin!: Relation_<Account> | undefined | null

    @OneToMany_(() => Event, e => e.call)
    events!: Relation_<Event[]>
}
