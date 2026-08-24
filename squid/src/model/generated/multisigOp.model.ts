import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"

@Entity_()
export class MultisigOp {
    constructor(props?: Partial<MultisigOp>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_multisig_op_multisig_d1de6182")
    @ManyToOne_(() => Account, {nullable: true})
    multisig!: Relation_<Account>

    @Index_("idx_multisig_op_call_hash_c150b6f4")
    @StringColumn_({nullable: false})
    callHash!: string

    @Index_("idx_multisig_op_depositor_95057224")
    @ManyToOne_(() => Account, {nullable: true})
    depositor!: Relation_<Account>

    /**
     * reserved from the depositor until the call runs or is called off
     */
    @BigIntColumn_({nullable: true})
    deposit!: bigint | undefined | null

    /**
     * approver account ids in approval order
     */
    @StringColumn_({array: true, nullable: false})
    approvals!: (string)[]

    @IntColumn_({nullable: true})
    threshold!: number | undefined | null

    /**
     * full signer set recovered from the opening call when unambiguous
     */
    @StringColumn_({array: true, nullable: true})
    signatories!: (string)[] | undefined | null

    @Index_("idx_multisig_op_status_8aba75f3")
    @StringColumn_({nullable: false})
    status!: string

    /**
     * dispatch outcome of an executed operation, ok or err
     */
    @StringColumn_({nullable: true})
    result!: string | undefined | null

    @IntColumn_({nullable: false})
    createdBlock!: number

    @Index_("idx_multisig_op_updated_block_f92f3020")
    @IntColumn_({nullable: false})
    updatedBlock!: number
}
