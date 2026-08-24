import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import {Bounty} from "./bounty.model"
import {Account} from "./account.model"

@Entity_()
export class ChildBounty {
    constructor(props?: Partial<ChildBounty>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_child_bounty_parent_8686a44b")
    @ManyToOne_(() => Bounty, {nullable: true})
    parent!: Relation_<Bounty>

    @IntColumn_({nullable: false})
    childIndex!: number

    @BigIntColumn_({nullable: false})
    value!: bigint

    @BigIntColumn_({nullable: true})
    fee!: bigint | undefined | null

    /**
     * reserved from the curator while they hold the job
     */
    @BigIntColumn_({nullable: true})
    curatorDeposit!: bigint | undefined | null

    @Index_("idx_child_bounty_curator_94b03874")
    @ManyToOne_(() => Account, {nullable: true})
    curator!: Relation_<Account> | undefined | null

    @Index_("idx_child_bounty_beneficiary_8c6fab5d")
    @ManyToOne_(() => Account, {nullable: true})
    beneficiary!: Relation_<Account> | undefined | null

    @StringColumn_({nullable: true})
    description!: string | undefined | null

    @Index_("idx_child_bounty_status_0b783feb")
    @StringColumn_({nullable: false})
    status!: string

    @BigIntColumn_({nullable: true})
    payout!: bigint | undefined | null

    @IntColumn_({nullable: false})
    createdAt!: number

    @IntColumn_({nullable: false})
    updatedAt!: number
}
