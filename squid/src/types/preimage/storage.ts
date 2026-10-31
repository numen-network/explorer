import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const requestStatusFor =  {
    /**
     *  The request status of a given hash.
     */
    v100: new StorageType('Preimage.RequestStatusFor', 'Optional', [v100.H256], v100.RequestStatus) as RequestStatusForV100,
}

/**
 *  The request status of a given hash.
 */
export interface RequestStatusForV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: v100.H256): Promise<(v100.RequestStatus | undefined)>
    getMany(block: Block, keys: v100.H256[]): Promise<(v100.RequestStatus | undefined)[]>
    getKeys(block: Block): Promise<v100.H256[]>
    getKeys(block: Block, key: v100.H256): Promise<v100.H256[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.H256[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.H256): AsyncIterable<v100.H256[]>
    getPairs(block: Block): Promise<[k: v100.H256, v: (v100.RequestStatus | undefined)][]>
    getPairs(block: Block, key: v100.H256): Promise<[k: v100.H256, v: (v100.RequestStatus | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.H256, v: (v100.RequestStatus | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.H256): AsyncIterable<[k: v100.H256, v: (v100.RequestStatus | undefined)][]>
}
