import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, JSONColumn as JSONColumn_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {Call} from "./call.model"

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

    @IntColumn_({nullable: false})
    threshold!: number

    /**
     * sorted signer set, the one the multisig account is derived from
     */
    @StringColumn_({array: true, nullable: false})
    signatories!: (string)[]

    /**
     * method of the last Multisig event the operation raised
     */
    @Index_("idx_multisig_op_status_8aba75f3")
    @StringColumn_({nullable: false})
    status!: string

    /**
     * DispatchResult of an executed operation, whole
     */
    @JSONColumn_({nullable: true})
    result!: unknown | undefined | null

    /**
     * the call the operation runs, as the as_multi that last carried it in full wraps it, null while every approval named only the hash
     */
    @Index_("idx_multisig_op_call_f7c83487")
    @ManyToOne_(() => Call, {nullable: true})
    call!: Relation_<Call> | undefined | null

    /**
     * one step per lifecycle event, its id, qualified name, account, block, timestamp and extrinsic
     */
    @JSONColumn_({nullable: false})
    timeline!: unknown

    @Index_("idx_multisig_op_created_block_51a4e08b")
    @IntColumn_({nullable: false})
    createdBlock!: number

    @IntColumn_({nullable: false})
    updatedBlock!: number
}
