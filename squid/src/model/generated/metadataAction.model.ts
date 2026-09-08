import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, Relation as Relation_, StringColumn as StringColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"

/**
 * append-only metadata log, one row per MetadataSet or MetadataCleared event, so every text a referendum ever carried stays readable
 */
@Entity_()
export class MetadataAction {
    constructor(props?: Partial<MetadataAction>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_metadata_action_referendum_cebd26a9")
    @ManyToOne_(() => Referendum, {nullable: true})
    referendum!: Relation_<Referendum>

    /**
     * set or cleared, a cleared row carries no text
     */
    @StringColumn_({nullable: false})
    kind!: string

    /**
     * preimage the pointer moved to or came off
     */
    @StringColumn_({nullable: false})
    hash!: string

    /**
     * null when the preimage was missing or held no first line
     */
    @StringColumn_({nullable: true})
    title!: string | undefined | null

    @StringColumn_({nullable: true})
    description!: string | undefined | null

    @IntColumn_({nullable: false})
    block!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
