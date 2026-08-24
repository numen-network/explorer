import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Token} from "./token.model"

@Index_("idx_token_holder_token_balance_a93fa67e", ["token", "balance"], {unique: false})
@Entity_()
export class TokenHolder {
    constructor(props?: Partial<TokenHolder>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @ManyToOne_(() => Token, {nullable: true})
    token!: Relation_<Token>

    @Index_("idx_token_holder_address_766650f5")
    @StringColumn_({nullable: false})
    address!: string

    @BigIntColumn_({nullable: false})
    balance!: bigint
}
