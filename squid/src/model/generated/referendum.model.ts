import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, ManyToOne as ManyToOne_, Relation as Relation_, StringColumn as StringColumn_, JSONColumn as JSONColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Track} from "./track.model"
import {Account} from "./account.model"
import {ReferendumStatus} from "./_referendumStatus"

@Entity_()
export class Referendum {
    constructor(props?: Partial<Referendum>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_referendum_index_feec7826", {unique: true})
    @IntColumn_({nullable: false})
    index!: number

    @Index_("idx_referendum_track_319f8fed")
    @ManyToOne_(() => Track, {nullable: true})
    track!: Relation_<Track>

    @StringColumn_({nullable: true})
    origin!: string | undefined | null

    @StringColumn_({nullable: true})
    proposalHash!: string | undefined | null

    /**
     * from the setMetadata preimage, a json object with title and description
     */
    @StringColumn_({nullable: true})
    title!: string | undefined | null

    @StringColumn_({nullable: true})
    description!: string | undefined | null

    /**
     * the call a proposal runs, read back from the runtime whether it sits inline or behind a preimage
     */
    @Index_("idx_referendum_proposal_pallet_d027df5d")
    @StringColumn_({nullable: true})
    proposalPallet!: string | undefined | null

    @Index_("idx_referendum_proposal_method_a540185e")
    @StringColumn_({nullable: true})
    proposalMethod!: string | undefined | null

    /**
     * the proposal call tree flattened in preorder, spend nodes carrying what they pay and when
     */
    @JSONColumn_({nullable: true})
    proposalCalls!: unknown | undefined | null

    /**
     * what the proposal asks the treasury for, summed over its spends
     */
    @BigIntColumn_({nullable: true})
    proposalAmount!: bigint | undefined | null

    /**
     * set when every spend pays one account
     */
    @StringColumn_({nullable: true})
    proposalBeneficiary!: string | undefined | null

    /**
     * bounty this referendum moves to approve, taken from the proposal call
     */
    @Index_("idx_referendum_proposal_bounty_index_d217b665")
    @IntColumn_({nullable: true})
    proposalBountyIndex!: number | undefined | null

    @Index_("idx_referendum_submitter_3fca5094")
    @ManyToOne_(() => Account, {nullable: true})
    submitter!: Relation_<Account> | undefined | null

    @IntColumn_({nullable: false})
    submittedAt!: number

    @Index_("idx_referendum_status_24792806")
    @Column_("varchar", {length: 10, nullable: false})
    status!: ReferendumStatus

    @IntColumn_({nullable: true})
    decidingSince!: number | undefined | null

    @IntColumn_({nullable: true})
    confirmingSince!: number | undefined | null

    @IntColumn_({nullable: true})
    endedAt!: number | undefined | null

    @BigIntColumn_({nullable: false})
    ayes!: bigint

    @BigIntColumn_({nullable: false})
    nays!: bigint

    @BigIntColumn_({nullable: false})
    support!: bigint

    @JSONColumn_({nullable: false})
    timeline!: unknown

    /**
     * plain reserves the chain records no reason for, cleared once refunded or slashed
     */
    @Index_("idx_referendum_submission_depositor_4bdb4f96")
    @StringColumn_({nullable: true})
    submissionDepositor!: string | undefined | null

    @BigIntColumn_({nullable: true})
    submissionDeposit!: bigint | undefined | null

    @Index_("idx_referendum_decision_depositor_a79f8b72")
    @StringColumn_({nullable: true})
    decisionDepositor!: string | undefined | null

    @BigIntColumn_({nullable: true})
    decisionDeposit!: bigint | undefined | null
}
