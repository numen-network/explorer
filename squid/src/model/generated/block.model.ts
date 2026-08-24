import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_, ManyToOne as ManyToOne_, Relation as Relation_, BigIntColumn as BigIntColumn_, BooleanColumn as BooleanColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

@Entity_()
export class Block {
    constructor(props?: Partial<Block>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_block_height_b20720ad")
    @IntColumn_({nullable: false})
    height!: number

    @Index_("idx_block_hash_b194b635", {unique: true})
    @StringColumn_({nullable: false})
    hash!: string

    @StringColumn_({nullable: false})
    parentHash!: string

    @Index_("idx_block_timestamp_82806c7c")
    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @IntColumn_({nullable: false})
    specVersion!: number

    @Index_("idx_block_author_c116954b")
    @ManyToOne_(() => Account, {nullable: true})
    author!: Relation_<Account> | undefined | null

    @BigIntColumn_({nullable: false})
    difficulty!: bigint

    @BigIntColumn_({nullable: false})
    reward!: bigint

    @StringColumn_({nullable: false})
    nonce!: string

    @StringColumn_({nullable: false})
    workHash!: string

    @Index_("idx_block_finalized_b535c2b5")
    @BooleanColumn_({nullable: false})
    finalized!: boolean

    @IntColumn_({nullable: false})
    extrinsicCount!: number

    @IntColumn_({nullable: false})
    eventCount!: number

    /**
     * scale encoded digest items of the header, in header order
     */
    @StringColumn_({array: true, nullable: false})
    logs!: (string)[]
}
