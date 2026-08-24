import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const identityOf =  {
    /**
     *  Information that is pertinent to identify the entity behind an account. First item is the
     *  registration, second is the account's primary username.
     * 
     *  TWOX-NOTE: OK ― `AccountId` is a secure hash.
     */
    v100: new StorageType('Identity.IdentityOf', 'Optional', [v100.AccountId32], v100.Registration) as IdentityOfV100,
}

/**
 *  Information that is pertinent to identify the entity behind an account. First item is the
 *  registration, second is the account's primary username.
 * 
 *  TWOX-NOTE: OK ― `AccountId` is a secure hash.
 */
export interface IdentityOfV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: v100.AccountId32): Promise<(v100.Registration | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<(v100.Registration | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: (v100.Registration | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: (v100.Registration | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: (v100.Registration | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: (v100.Registration | undefined)][]>
}

export const usernameOf =  {
    /**
     *  Identifies the primary username of an account.
     */
    v100: new StorageType('Identity.UsernameOf', 'Optional', [v100.AccountId32], v100.BoundedVec) as UsernameOfV100,
}

/**
 *  Identifies the primary username of an account.
 */
export interface UsernameOfV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: v100.AccountId32): Promise<(v100.BoundedVec | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<(v100.BoundedVec | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: (v100.BoundedVec | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: (v100.BoundedVec | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: (v100.BoundedVec | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: (v100.BoundedVec | undefined)][]>
}

export const superOf =  {
    /**
     *  The super-identity of an alternative "sub" identity together with its name, within that
     *  context. If the account is not some other account's sub-identity, then just `None`.
     */
    v100: new StorageType('Identity.SuperOf', 'Optional', [v100.AccountId32], sts.tuple(() => [v100.AccountId32, v100.Data])) as SuperOfV100,
}

/**
 *  The super-identity of an alternative "sub" identity together with its name, within that
 *  context. If the account is not some other account's sub-identity, then just `None`.
 */
export interface SuperOfV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: v100.AccountId32): Promise<([v100.AccountId32, v100.Data] | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<([v100.AccountId32, v100.Data] | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: ([v100.AccountId32, v100.Data] | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: ([v100.AccountId32, v100.Data] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: ([v100.AccountId32, v100.Data] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: ([v100.AccountId32, v100.Data] | undefined)][]>
}

export const subsOf =  {
    /**
     *  Alternative "sub" identities of this account.
     * 
     *  The first item is the deposit, the second is a vector of the accounts.
     * 
     *  TWOX-NOTE: OK ― `AccountId` is a secure hash.
     */
    v100: new StorageType('Identity.SubsOf', 'Default', [v100.AccountId32], sts.tuple(() => [sts.bigint(), sts.array(() => v100.AccountId32)])) as SubsOfV100,
}

/**
 *  Alternative "sub" identities of this account.
 * 
 *  The first item is the deposit, the second is a vector of the accounts.
 * 
 *  TWOX-NOTE: OK ― `AccountId` is a secure hash.
 */
export interface SubsOfV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): [bigint, v100.AccountId32[]]
    get(block: Block, key: v100.AccountId32): Promise<([bigint, v100.AccountId32[]] | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<([bigint, v100.AccountId32[]] | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: ([bigint, v100.AccountId32[]] | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: ([bigint, v100.AccountId32[]] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: ([bigint, v100.AccountId32[]] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: ([bigint, v100.AccountId32[]] | undefined)][]>
}

export const registrars =  {
    /**
     *  The set of registrars. Not expected to get very big as can only be added through a
     *  special origin (likely a council motion).
     * 
     *  The index into this can be cast to `RegistrarIndex` to get a valid value.
     */
    v100: new StorageType('Identity.Registrars', 'Default', [], sts.array(() => sts.option(() => v100.RegistrarInfo))) as RegistrarsV100,
}

/**
 *  The set of registrars. Not expected to get very big as can only be added through a
 *  special origin (likely a council motion).
 * 
 *  The index into this can be cast to `RegistrarIndex` to get a valid value.
 */
export interface RegistrarsV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): (v100.RegistrarInfo | undefined)[]
    get(block: Block): Promise<((v100.RegistrarInfo | undefined)[] | undefined)>
}

export const authorityOf =  {
    /**
     *  A map of the accounts who are authorized to grant usernames.
     */
    v100: new StorageType('Identity.AuthorityOf', 'Optional', [sts.bytes()], v100.AuthorityProperties) as AuthorityOfV100,
}

/**
 *  A map of the accounts who are authorized to grant usernames.
 */
export interface AuthorityOfV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: Bytes): Promise<(v100.AuthorityProperties | undefined)>
    getMany(block: Block, keys: Bytes[]): Promise<(v100.AuthorityProperties | undefined)[]>
    getKeys(block: Block): Promise<Bytes[]>
    getKeys(block: Block, key: Bytes): Promise<Bytes[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<Bytes[]>
    getKeysPaged(pageSize: number, block: Block, key: Bytes): AsyncIterable<Bytes[]>
    getPairs(block: Block): Promise<[k: Bytes, v: (v100.AuthorityProperties | undefined)][]>
    getPairs(block: Block, key: Bytes): Promise<[k: Bytes, v: (v100.AuthorityProperties | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: Bytes, v: (v100.AuthorityProperties | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: Bytes): AsyncIterable<[k: Bytes, v: (v100.AuthorityProperties | undefined)][]>
}

export const usernameInfoOf =  {
    /**
     *  Reverse lookup from `username` to the `AccountId` that has registered it and the provider of
     *  the username. The `owner` value should be a key in the `UsernameOf` map, but it may not if
     *  the user has cleared their username or it has been removed.
     * 
     *  Multiple usernames may map to the same `AccountId`, but `UsernameOf` will only map to one
     *  primary username.
     */
    v100: new StorageType('Identity.UsernameInfoOf', 'Optional', [v100.BoundedVec], v100.UsernameInformation) as UsernameInfoOfV100,
}

/**
 *  Reverse lookup from `username` to the `AccountId` that has registered it and the provider of
 *  the username. The `owner` value should be a key in the `UsernameOf` map, but it may not if
 *  the user has cleared their username or it has been removed.
 * 
 *  Multiple usernames may map to the same `AccountId`, but `UsernameOf` will only map to one
 *  primary username.
 */
export interface UsernameInfoOfV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: v100.BoundedVec): Promise<(v100.UsernameInformation | undefined)>
    getMany(block: Block, keys: v100.BoundedVec[]): Promise<(v100.UsernameInformation | undefined)[]>
    getKeys(block: Block): Promise<v100.BoundedVec[]>
    getKeys(block: Block, key: v100.BoundedVec): Promise<v100.BoundedVec[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.BoundedVec[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.BoundedVec): AsyncIterable<v100.BoundedVec[]>
    getPairs(block: Block): Promise<[k: v100.BoundedVec, v: (v100.UsernameInformation | undefined)][]>
    getPairs(block: Block, key: v100.BoundedVec): Promise<[k: v100.BoundedVec, v: (v100.UsernameInformation | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.BoundedVec, v: (v100.UsernameInformation | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.BoundedVec): AsyncIterable<[k: v100.BoundedVec, v: (v100.UsernameInformation | undefined)][]>
}
