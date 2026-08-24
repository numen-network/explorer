import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, JSONColumn as JSONColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"
import {Account} from "./account.model"

@Entity_()
export class Bounty {
    constructor(props?: Partial<Bounty>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_bounty_index_1ff911c5", {unique: true})
    @IntColumn_({nullable: false})
    index!: number

    /**
     * referendum that moves to approve this bounty, resolved from its call
     */
    @Index_("idx_bounty_referendum_dbb0dfcc")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum> | undefined | null

    @Index_("idx_bounty_proposer_d9eab326")
    @ManyToOne_(() => Account, {nullable: true})
    proposer!: Relation_<Account> | undefined | null

    @BigIntColumn_({nullable: false})
    value!: bigint

    /**
     * curator fee taken out of the value on payout
     */
    @BigIntColumn_({nullable: true})
    fee!: bigint | undefined | null

    /**
     * reserved from the proposer until the bounty is funded or rejected
     */
    @BigIntColumn_({nullable: true})
    bond!: bigint | undefined | null

    /**
     * reserved from the curator while they hold the job
     */
    @BigIntColumn_({nullable: true})
    curatorDeposit!: bigint | undefined | null

    @Index_("idx_bounty_curator_33da2103")
    @ManyToOne_(() => Account, {nullable: true})
    curator!: Relation_<Account> | undefined | null

    @Index_("idx_bounty_beneficiary_c5353b0f")
    @ManyToOne_(() => Account, {nullable: true})
    beneficiary!: Relation_<Account> | undefined | null

    @StringColumn_({nullable: true})
    description!: string | undefined | null

    @Index_("idx_bounty_status_d57f0f1c")
    @StringColumn_({nullable: false})
    status!: string

    @IntColumn_({nullable: true})
    unlockAt!: number | undefined | null

    @IntColumn_({nullable: true})
    updateDue!: number | undefined | null

    @BigIntColumn_({nullable: true})
    payout!: bigint | undefined | null

    @IntColumn_({nullable: false})
    createdAt!: number

    @Index_("idx_bounty_updated_at_27303462")
    @IntColumn_({nullable: false})
    updatedAt!: number

    @JSONColumn_({nullable: false})
    timeline!: unknown
}
