import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToOne as OneToOne_, Index as Index_, JoinColumn as JoinColumn_, Relation as Relation_, BooleanColumn as BooleanColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

@Entity_()
export class Validator {
    constructor(props?: Partial<Validator>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_validator_account_6c60d32a", {unique: true})
    @OneToOne_(() => Account, {nullable: true})
    @JoinColumn_()
    account!: Relation_<Account>

    @Index_("idx_validator_active_c83c422c")
    @BooleanColumn_({nullable: false})
    active!: boolean

    @BigIntColumn_({nullable: false})
    lockedAmount!: bigint

    @IntColumn_({nullable: true})
    lockExpiry!: number | undefined | null

    @IntColumn_({nullable: false})
    offlineSessions!: number

    @IntColumn_({nullable: false})
    equivocations!: number

    @StringColumn_({nullable: true})
    kicked!: string | undefined | null

    @IntColumn_({nullable: false})
    firstSeenBlock!: number

    @IntColumn_({nullable: false})
    lastActiveSession!: number
}
