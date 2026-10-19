import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Token} from "./token.model"

/**
 * an address's transfers of one token with one counterparty, summed since genesis
 */
@Index_("idx_token_transfer_pair_address_token_amount_in_7c1dbe1e", ["address", "token", "amountIn"], {unique: false})
@Index_("idx_token_transfer_pair_address_token_count_in_409f4a5e", ["address", "token", "countIn"], {unique: false})
@Index_("idx_token_transfer_pair_address_token_amount_out_8a3028b6", ["address", "token", "amountOut"], {unique: false})
@Index_("idx_token_transfer_pair_address_token_count_out_7c7f05ac", ["address", "token", "countOut"], {unique: false})
@Entity_()
export class TokenTransferPair {
    constructor(props?: Partial<TokenTransferPair>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_token_transfer_pair_token_2209eeae")
    @ManyToOne_(() => Token, {nullable: true})
    token!: Relation_<Token>

    @StringColumn_({nullable: false})
    address!: string

    @StringColumn_({nullable: false})
    counterparty!: string

    @BigIntColumn_({nullable: false})
    amountIn!: bigint

    @IntColumn_({nullable: false})
    countIn!: number

    @BigIntColumn_({nullable: false})
    amountOut!: bigint

    @IntColumn_({nullable: false})
    countOut!: number

    @IntColumn_({nullable: false})
    firstBlock!: number

    @IntColumn_({nullable: false})
    lastBlock!: number
}
