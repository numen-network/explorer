import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, IntColumn as IntColumn_, StringColumn as StringColumn_, OneToMany as OneToMany_, BooleanColumn as BooleanColumn_, JSONColumn as JSONColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Block} from "./block.model"
import {Account} from "./account.model"
import {Call} from "./call.model"
import {Transfer} from "./transfer.model"

@Entity_()
export class Extrinsic {
    constructor(props?: Partial<Extrinsic>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_extrinsic_block_bdb25d72")
    @ManyToOne_(() => Block, {nullable: true})
    block!: Relation_<Block>

    @IntColumn_({nullable: false})
    indexInBlock!: number

    @Index_("idx_extrinsic_hash_fb7b0484")
    @StringColumn_({nullable: false})
    hash!: string

    @Index_("idx_extrinsic_pallet_10b2b37c")
    @StringColumn_({nullable: false})
    pallet!: string

    @Index_("idx_extrinsic_method_9d338e4d")
    @StringColumn_({nullable: false})
    method!: string

    @Index_("idx_extrinsic_signer_ad75509b")
    @ManyToOne_(() => Account, {nullable: true})
    signer!: Relation_<Account> | undefined | null

    @OneToMany_(() => Call, e => e.extrinsic)
    calls!: Relation_<Call[]>

    @OneToMany_(() => Transfer, e => e.extrinsic)
    transfers!: Relation_<Transfer[]>

    @BooleanColumn_({nullable: false})
    success!: boolean

    @JSONColumn_({nullable: true})
    error!: unknown | undefined | null

    /**
     * what running this extrinsic cost with the tip left out, null when it paid nothing
     */
    @BigIntColumn_({nullable: true})
    fee!: bigint | undefined | null

    /**
     * tip the sender added, an EVM priority fee counted as one
     */
    @BigIntColumn_({nullable: true})
    tip!: bigint | undefined | null

    /**
     * share of the fee the miner kept, with the tip paid on top
     */
    @BigIntColumn_({nullable: false})
    minerFee!: bigint

    /**
     * part of the fee that funded the treasury
     */
    @BigIntColumn_({nullable: false})
    treasuryFee!: bigint
}
