import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, IntColumn as IntColumn_, StringColumn as StringColumn_, BytesColumn as BytesColumn_} from "@subsquid/typeorm-store"
import {EvmTransaction} from "./evmTransaction.model"
import {Extrinsic} from "./extrinsic.model"
import {Block} from "./block.model"

@Index_("idx_evm_log_address_log_index_bd062870", ["address", "logIndex"], {unique: false})
@Entity_()
export class EvmLog {
    constructor(props?: Partial<EvmLog>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    /**
     * null for a log no Ethereum transaction raised, like one from a substrate signed Revive.call or an EVM.call dispatched as Root
     */
    @Index_("idx_evm_log_transaction_aa2eff54")
    @ManyToOne_(() => EvmTransaction, {nullable: true})
    transaction!: Relation_<EvmTransaction> | undefined | null

    /**
     * the extrinsic that raised it, null when no extrinsic did
     */
    @Index_("idx_evm_log_extrinsic_49507914")
    @ManyToOne_(() => Extrinsic, {nullable: true})
    extrinsic!: Relation_<Extrinsic> | undefined | null

    @Index_("idx_evm_log_block_c9cb892d")
    @ManyToOne_(() => Block, {nullable: true})
    block!: Relation_<Block>

    /**
     * a Frontier transaction's log takes its position among the block's transaction logs, any other log takes the event index
     */
    @IntColumn_({nullable: false})
    logIndex!: number

    @StringColumn_({nullable: false})
    address!: string

    @Index_("idx_evm_log_topic0_7446ac04")
    @StringColumn_({nullable: true})
    topic0!: string | undefined | null

    @StringColumn_({array: true, nullable: false})
    topics!: (string)[]

    @BytesColumn_({nullable: false})
    data!: Uint8Array
}
