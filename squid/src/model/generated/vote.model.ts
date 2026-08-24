import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, BooleanColumn as BooleanColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"
import {Account} from "./account.model"

@Entity_()
export class Vote {
    constructor(props?: Partial<Vote>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_vote_referendum_0f9860c6")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum>

    @Index_("idx_vote_voter_f6a67bf9")
    @ManyToOne_(() => Account, {nullable: true})
    voter!: Relation_<Account>

    @StringColumn_({nullable: false})
    decision!: string

    @BigIntColumn_({nullable: false})
    amount!: bigint

    @StringColumn_({nullable: true})
    conviction!: string | undefined | null

    @IntColumn_({nullable: false})
    block!: number

    @BooleanColumn_({nullable: false})
    removed!: boolean
}
