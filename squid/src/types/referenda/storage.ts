import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'
import * as v10200 from '../v10200'

export const referendumInfoFor =  {
    /**
     *  Information concerning any given referendum.
     */
    v100: new StorageType('Referenda.ReferendumInfoFor', 'Optional', [sts.number()], v100.ReferendumInfo) as ReferendumInfoForV100,
    /**
     *  Information concerning any given referendum.
     */
    v10200: new StorageType('Referenda.ReferendumInfoFor', 'Optional', [sts.number()], v10200.ReferendumInfo) as ReferendumInfoForV10200,
}

/**
 *  Information concerning any given referendum.
 */
export interface ReferendumInfoForV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: number): Promise<(v100.ReferendumInfo | undefined)>
    getMany(block: Block, keys: number[]): Promise<(v100.ReferendumInfo | undefined)[]>
    getKeys(block: Block): Promise<number[]>
    getKeys(block: Block, key: number): Promise<number[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<number[]>
    getKeysPaged(pageSize: number, block: Block, key: number): AsyncIterable<number[]>
    getPairs(block: Block): Promise<[k: number, v: (v100.ReferendumInfo | undefined)][]>
    getPairs(block: Block, key: number): Promise<[k: number, v: (v100.ReferendumInfo | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: number, v: (v100.ReferendumInfo | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: number): AsyncIterable<[k: number, v: (v100.ReferendumInfo | undefined)][]>
}

/**
 *  Information concerning any given referendum.
 */
export interface ReferendumInfoForV10200  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: number): Promise<(v10200.ReferendumInfo | undefined)>
    getMany(block: Block, keys: number[]): Promise<(v10200.ReferendumInfo | undefined)[]>
    getKeys(block: Block): Promise<number[]>
    getKeys(block: Block, key: number): Promise<number[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<number[]>
    getKeysPaged(pageSize: number, block: Block, key: number): AsyncIterable<number[]>
    getPairs(block: Block): Promise<[k: number, v: (v10200.ReferendumInfo | undefined)][]>
    getPairs(block: Block, key: number): Promise<[k: number, v: (v10200.ReferendumInfo | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: number, v: (v10200.ReferendumInfo | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: number): AsyncIterable<[k: number, v: (v10200.ReferendumInfo | undefined)][]>
}
