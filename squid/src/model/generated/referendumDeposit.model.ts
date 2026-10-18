import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"
import {ReferendumDepositKind} from "./_referendumDepositKind"
import {Account} from "./account.model"
import {ReferendumDepositState} from "./_referendumDepositState"

/**
 * a plain reserve the chain records no reason for, kept after it is refunded or slashed
 */
@Entity_()
export class ReferendumDeposit {
    constructor(props?: Partial<ReferendumDeposit>) {
        Object.assign(this, props)
    }

    /**
     * the referendum index and the kind in lowercase
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_referendum_deposit_referendum_315283c8")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum>

    @Column_("varchar", {length: 10, nullable: false})
    kind!: ReferendumDepositKind

    /**
     * null when the submit dispatched under an origin the indexer cannot resolve
     */
    @Index_("idx_referendum_deposit_who_7b8074ee")
    @ManyToOne_(() => Account, {nullable: true})
    who!: Relation_<Account> | undefined | null

    @BigIntColumn_({nullable: false})
    amount!: bigint

    @IntColumn_({nullable: false})
    placedAt!: number

    @Index_("idx_referendum_deposit_state_cdd110cb")
    @Column_("varchar", {length: 8, nullable: false})
    state!: ReferendumDepositState

    /**
     * block of the refund or of the kill that slashed it
     */
    @IntColumn_({nullable: true})
    endedAt!: number | undefined | null
}
