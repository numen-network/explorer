import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Block} from "./block.model"
import {Extrinsic} from "./extrinsic.model"
import {Call} from "./call.model"
import {Account} from "./account.model"

@Index_("idx_transfer_from_timestamp_7990c96e", ["from", "timestamp"], {unique: false})
@Index_("idx_transfer_to_timestamp_7c7a109c", ["to", "timestamp"], {unique: false})
@Entity_()
export class Transfer {
    constructor(props?: Partial<Transfer>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_transfer_block_1ca50110")
    @ManyToOne_(() => Block, {nullable: true})
    block!: Relation_<Block>

    @Index_("idx_transfer_extrinsic_cd6f539e")
    @ManyToOne_(() => Extrinsic, {nullable: true})
    extrinsic!: Relation_<Extrinsic> | undefined | null

    /**
     * the call that moved the money, which a batch or a proxy hides from the extrinsic
     */
    @Index_("idx_transfer_call_7739b9a5")
    @ManyToOne_(() => Call, {nullable: true})
    call!: Relation_<Call> | undefined | null

    @ManyToOne_(() => Account, {nullable: true})
    from!: Relation_<Account>

    @ManyToOne_(() => Account, {nullable: true})
    to!: Relation_<Account>

    @BigIntColumn_({nullable: false})
    amount!: bigint

    @Index_("idx_transfer_timestamp_cc1edef1")
    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
