import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, IntColumn as IntColumn_, ManyToOne as ManyToOne_, Relation as Relation_, BigIntColumn as BigIntColumn_, BytesColumn as BytesColumn_, DateTimeColumn as DateTimeColumn_, JSONColumn as JSONColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Account} from "./account.model"
import {Extrinsic} from "./extrinsic.model"
import {MetadataAction} from "./metadataAction.model"
import {Referendum} from "./referendum.model"

/**
 * one row per stay of a hash in the preimage store, from the Noted or Requested
 * that opened it to the Cleared that closed it, the same hash coming back opens
 * a new row. kind, title and calls are worked out by the indexer, the chain holds
 * only the bytes
 */
@Entity_()
export class Preimage {
    constructor(props?: Partial<Preimage>) {
        Object.assign(this, props)
    }

    /**
     * the id of the event that opened it
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_preimage_hash_b66a8390")
    @StringColumn_({nullable: false})
    hash!: string

    /**
     * the RequestStatus variant name while the chain holds it, Cleared after, the variant moves without an event so every batch reads it back
     */
    @Index_("idx_preimage_status_56bda762")
    @StringColumn_({nullable: false})
    status!: string

    /**
     * byte length, null on a request nobody has noted yet
     */
    @IntColumn_({nullable: true})
    len!: number | undefined | null

    /**
     * who holds the deposit, null while a request carries no ticket
     */
    @Index_("idx_preimage_depositor_aba0bebf")
    @ManyToOne_(() => Account, {nullable: true})
    depositor!: Relation_<Account> | undefined | null

    /**
     * what the ticket holds
     */
    @BigIntColumn_({nullable: true})
    deposit!: bigint | undefined | null

    /**
     * open requests, 0 on an Unrequested or Cleared row
     */
    @IntColumn_({nullable: false})
    requestCount!: number

    /**
     * null until noted and when the block that noted them also dropped them
     */
    @BytesColumn_({nullable: true})
    bytes!: Uint8Array | undefined | null

    /**
     * block of the Noted event, null on a request nobody has noted
     */
    @IntColumn_({nullable: true})
    notedBlock!: number | undefined | null

    @DateTimeColumn_({nullable: true})
    notedAt!: Date | undefined | null

    /**
     * the extrinsic that raised Noted, null when the block itself did
     */
    @Index_("idx_preimage_extrinsic_40d3dc5d")
    @ManyToOne_(() => Extrinsic, {nullable: true})
    extrinsic!: Relation_<Extrinsic> | undefined | null

    @IntColumn_({nullable: true})
    clearedBlock!: number | undefined | null

    @DateTimeColumn_({nullable: true})
    clearedAt!: Date | undefined | null

    /**
     * Call when the bytes decode whole as a call of the runtime at notedBlock, otherwise Text when they are valid utf8 free of NUL, otherwise Raw, null without bytes
     */
    @StringColumn_({nullable: true})
    kind!: string | undefined | null

    /**
     * first line of Text bytes, null when it is blank
     */
    @StringColumn_({nullable: true})
    title!: string | undefined | null

    /**
     * a Call flattened in preorder, shaped like Referendum.proposalCalls
     */
    @JSONColumn_({nullable: true})
    calls!: unknown | undefined | null

    @OneToMany_(() => MetadataAction, e => e.preimage)
    metadataActions!: Relation_<MetadataAction[]>

    @OneToMany_(() => Referendum, e => e.proposalPreimage)
    referenda!: Relation_<Referendum[]>
}
