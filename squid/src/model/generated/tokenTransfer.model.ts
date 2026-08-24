import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Token} from "./token.model"
import {EvmTransaction} from "./evmTransaction.model"
import {Block} from "./block.model"

@Entity_()
export class TokenTransfer {
    constructor(props?: Partial<TokenTransfer>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_token_transfer_token_e0bf4a8e")
    @ManyToOne_(() => Token, {nullable: true})
    token!: Relation_<Token>

    @Index_("idx_token_transfer_from_13617e2f")
    @StringColumn_({nullable: false})
    from!: string

    @Index_("idx_token_transfer_to_3543af45")
    @StringColumn_({nullable: false})
    to!: string

    @BigIntColumn_({nullable: false})
    amount!: bigint

    @Index_("idx_token_transfer_transaction_9b9a6656")
    @ManyToOne_(() => EvmTransaction, {nullable: true})
    transaction!: Relation_<EvmTransaction>

    @Index_("idx_token_transfer_block_de0e3f3a")
    @ManyToOne_(() => Block, {nullable: true})
    block!: Relation_<Block>

    @Index_("idx_token_transfer_timestamp_0bb3ae39")
    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
