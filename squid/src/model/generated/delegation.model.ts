import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {Track} from "./track.model"

@Entity_()
export class Delegation {
    constructor(props?: Partial<Delegation>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_delegation_who_4c79bac5")
    @ManyToOne_(() => Account, {nullable: true})
    who!: Relation_<Account>

    @Index_("idx_delegation_target_54f285e6")
    @ManyToOne_(() => Account, {nullable: true})
    target!: Relation_<Account>

    @Index_("idx_delegation_track_c05b90a8")
    @ManyToOne_(() => Track, {nullable: true})
    track!: Relation_<Track>

    @StringColumn_({nullable: false})
    conviction!: string

    @BigIntColumn_({nullable: false})
    balance!: bigint

    @IntColumn_({nullable: false})
    block!: number
}
