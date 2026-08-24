import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const votingFor =  {
    /**
     *  All voting for a particular voter in a particular voting class. We store the balance for the
     *  number of votes that we have recorded.
     */
    v100: new StorageType('ConvictionVoting.VotingFor', 'Default', [v100.AccountId32, sts.number()], v100.Voting) as VotingForV100,
}

/**
 *  All voting for a particular voter in a particular voting class. We store the balance for the
 *  number of votes that we have recorded.
 */
export interface VotingForV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): v100.Voting
    get(block: Block, key1: v100.AccountId32, key2: number): Promise<(v100.Voting | undefined)>
    getMany(block: Block, keys: [v100.AccountId32, number][]): Promise<(v100.Voting | undefined)[]>
    getKeys(block: Block): Promise<[v100.AccountId32, number][]>
    getKeys(block: Block, key1: v100.AccountId32): Promise<[v100.AccountId32, number][]>
    getKeys(block: Block, key1: v100.AccountId32, key2: number): Promise<[v100.AccountId32, number][]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<[v100.AccountId32, number][]>
    getKeysPaged(pageSize: number, block: Block, key1: v100.AccountId32): AsyncIterable<[v100.AccountId32, number][]>
    getKeysPaged(pageSize: number, block: Block, key1: v100.AccountId32, key2: number): AsyncIterable<[v100.AccountId32, number][]>
    getPairs(block: Block): Promise<[k: [v100.AccountId32, number], v: (v100.Voting | undefined)][]>
    getPairs(block: Block, key1: v100.AccountId32): Promise<[k: [v100.AccountId32, number], v: (v100.Voting | undefined)][]>
    getPairs(block: Block, key1: v100.AccountId32, key2: number): Promise<[k: [v100.AccountId32, number], v: (v100.Voting | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: [v100.AccountId32, number], v: (v100.Voting | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key1: v100.AccountId32): AsyncIterable<[k: [v100.AccountId32, number], v: (v100.Voting | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key1: v100.AccountId32, key2: number): AsyncIterable<[k: [v100.AccountId32, number], v: (v100.Voting | undefined)][]>
}
