import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BytesColumn as BytesColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class MeshTopology {
    constructor(props?: Partial<MeshTopology>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    /**
     * gzip of little endian u16 index triples, one row per protocol version
     */
    @BytesColumn_({nullable: false})
    faces!: Uint8Array

    @IntColumn_({nullable: false})
    faceCount!: number
}
