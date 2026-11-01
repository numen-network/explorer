import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, StringColumn as StringColumn_, BytesColumn as BytesColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class RuntimeVersion {
    constructor(props?: Partial<RuntimeVersion>) {
        Object.assign(this, props)
    }

    /**
     * the spec version
     */
    @PrimaryColumn_()
    id!: string

    @Index_("idx_runtime_version_spec_version_ea73cc82", {unique: true})
    @IntColumn_({nullable: false})
    specVersion!: number

    @StringColumn_({nullable: false})
    specName!: string

    @StringColumn_({nullable: false})
    implName!: string

    @IntColumn_({nullable: false})
    implVersion!: number

    @IntColumn_({nullable: false})
    transactionVersion!: number

    /**
     * the first block that ran on this version
     */
    @IntColumn_({nullable: false})
    firstBlock!: number

    @BytesColumn_({nullable: false})
    metadata!: Uint8Array
}
