import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"

/**
 * tally read back from chain storage at each block a voting action landed in
 */
@Entity_()
export class ReferendumTallySnapshot {
    constructor(props?: Partial<ReferendumTallySnapshot>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_referendum_tally_snapshot_referendum_497a6e6b")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum>

    @Index_("idx_referendum_tally_snapshot_block_6e3bcde9")
    @IntColumn_({nullable: false})
    block!: number

    @BigIntColumn_({nullable: false})
    ayes!: bigint

    @BigIntColumn_({nullable: false})
    nays!: bigint

    @BigIntColumn_({nullable: false})
    support!: bigint

    /**
     * support denominator at the same block
     */
    @BigIntColumn_({nullable: false})
    activeIssuance!: bigint
}
