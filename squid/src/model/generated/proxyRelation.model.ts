import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

@Entity_()
export class ProxyRelation {
    constructor(props?: Partial<ProxyRelation>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_proxy_relation_delegator_e1a7bb3c")
    @ManyToOne_(() => Account, {nullable: true})
    delegator!: Relation_<Account>

    @Index_("idx_proxy_relation_delegatee_7ed4f938")
    @ManyToOne_(() => Account, {nullable: true})
    delegatee!: Relation_<Account>

    @StringColumn_({nullable: false})
    proxyType!: string

    /**
     * announcement delay in blocks
     */
    @IntColumn_({nullable: false})
    delay!: number
}
