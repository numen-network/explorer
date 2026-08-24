import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToOne as OneToOne_, Index as Index_, JoinColumn as JoinColumn_, Relation as Relation_, StringColumn as StringColumn_, BytesColumn as BytesColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Block} from "./block.model"

@Entity_()
export class MinedObject {
    constructor(props?: Partial<MinedObject>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_("idx_mined_object_block_a24f655d", {unique: true})
    @OneToOne_(() => Block, {nullable: true})
    @JoinColumn_()
    block!: Relation_<Block>

    @StringColumn_({nullable: false})
    protocol!: string

    /**
     * gzip of little endian f32 xyz triples in node emission order
     */
    @BytesColumn_({nullable: false})
    vertices!: Uint8Array

    @IntColumn_({nullable: false})
    vertexCount!: number
}
