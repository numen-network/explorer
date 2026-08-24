import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToOne as OneToOne_, Index as Index_, JoinColumn as JoinColumn_, Relation as Relation_, ManyToOne as ManyToOne_, IntColumn as IntColumn_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, BytesColumn as BytesColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Extrinsic} from "./extrinsic.model"
import {Block} from "./block.model"

@Entity_()
export class EvmTransaction {
    constructor(props?: Partial<EvmTransaction>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_evm_transaction_extrinsic_9cdb2599", {unique: true})
    @OneToOne_(() => Extrinsic, {nullable: true})
    @JoinColumn_()
    extrinsic!: Relation_<Extrinsic>

    @Index_("idx_evm_transaction_block_4ee56ee5")
    @ManyToOne_(() => Block, {nullable: true})
    block!: Relation_<Block>

    @IntColumn_({nullable: false})
    txIndex!: number

    @Index_("idx_evm_transaction_from_539e4b13")
    @StringColumn_({nullable: false})
    from!: string

    @Index_("idx_evm_transaction_to_ec297d22")
    @StringColumn_({nullable: true})
    to!: string | undefined | null

    @Index_("idx_evm_transaction_contract_address_cd30fa26")
    @StringColumn_({nullable: true})
    contractAddress!: string | undefined | null

    @BigIntColumn_({nullable: false})
    value!: bigint

    @BytesColumn_({nullable: false})
    input!: Uint8Array

    @Index_("idx_evm_transaction_input_selector_1e46891d")
    @StringColumn_({nullable: true})
    inputSelector!: string | undefined | null

    @IntColumn_({nullable: false})
    nonce!: number

    @BigIntColumn_({nullable: false})
    gasLimit!: bigint

    @BigIntColumn_({nullable: false})
    gasUsed!: bigint

    @BigIntColumn_({nullable: false})
    gasPrice!: bigint

    @IntColumn_({nullable: false})
    txType!: number

    @StringColumn_({nullable: false})
    status!: string

    @StringColumn_({nullable: true})
    statusReason!: string | undefined | null

    @Index_("idx_evm_transaction_timestamp_2aa7be18")
    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
