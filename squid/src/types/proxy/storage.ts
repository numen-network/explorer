import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const proxies =  {
    /**
     *  The set of account proxies. Maps the account which has delegated to the accounts
     *  which are being delegated to, together with the amount held on deposit.
     */
    v100: new StorageType('Proxy.Proxies', 'Default', [v100.AccountId32], sts.tuple(() => [sts.array(() => v100.ProxyDefinition), sts.bigint()])) as ProxiesV100,
}

/**
 *  The set of account proxies. Maps the account which has delegated to the accounts
 *  which are being delegated to, together with the amount held on deposit.
 */
export interface ProxiesV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): [v100.ProxyDefinition[], bigint]
    get(block: Block, key: v100.AccountId32): Promise<([v100.ProxyDefinition[], bigint] | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<([v100.ProxyDefinition[], bigint] | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: ([v100.ProxyDefinition[], bigint] | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: ([v100.ProxyDefinition[], bigint] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: ([v100.ProxyDefinition[], bigint] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: ([v100.ProxyDefinition[], bigint] | undefined)][]>
}

export const announcements =  {
    /**
     *  The announcements made by the proxy (key).
     */
    v100: new StorageType('Proxy.Announcements', 'Default', [v100.AccountId32], sts.tuple(() => [sts.array(() => v100.Announcement), sts.bigint()])) as AnnouncementsV100,
}

/**
 *  The announcements made by the proxy (key).
 */
export interface AnnouncementsV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): [v100.Announcement[], bigint]
    get(block: Block, key: v100.AccountId32): Promise<([v100.Announcement[], bigint] | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<([v100.Announcement[], bigint] | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: ([v100.Announcement[], bigint] | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: ([v100.Announcement[], bigint] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: ([v100.Announcement[], bigint] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: ([v100.Announcement[], bigint] | undefined)][]>
}
