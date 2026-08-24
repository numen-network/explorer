import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

@Entity_()
export class PrimeState {
    constructor(props?: Partial<PrimeState>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_prime_state_account_386e528c")
    @ManyToOne_(() => Account, {nullable: true})
    account!: Relation_<Account>

    @IntColumn_({nullable: false})
    since!: number
}
