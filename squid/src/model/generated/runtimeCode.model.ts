import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, IntColumn as IntColumn_, Index as Index_, BytesColumn as BytesColumn_, OneToMany as OneToMany_, Relation as Relation_} from "@subsquid/typeorm-store"
import {Referendum} from "./referendum.model"

/**
 * a runtime wasm a referendum proposes, every field but the id null when it doesn't run as one
 */
@Entity_()
export class RuntimeCode {
    constructor(props?: Partial<RuntimeCode>) {
        Object.assign(this, props)
    }

    /**
     * blake2_256 of the wasm
     */
    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: true})
    specName!: string | undefined | null

    @Index_("idx_runtime_code_spec_version_284df73b")
    @IntColumn_({nullable: true})
    specVersion!: number | undefined | null

    @IntColumn_({nullable: true})
    implVersion!: number | undefined | null

    @IntColumn_({nullable: true})
    transactionVersion!: number | undefined | null

    @BytesColumn_({nullable: true})
    metadata!: Uint8Array | undefined | null

    @OneToMany_(() => Referendum, e => e.proposalRuntime)
    referenda!: Relation_<Referendum[]>
}
