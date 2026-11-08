import {sts, Result, Option, Bytes, BitSequence} from './support'

export interface ReceiptGasInfo {
    gasUsed: bigint
    effectiveGasPrice: bigint
}

export const ReceiptGasInfo: sts.Type<ReceiptGasInfo> = sts.struct(() => {
    return  {
        gasUsed: sts.bigint(),
        effectiveGasPrice: sts.bigint(),
    }
})

export type H256 = Bytes

export type H160 = Bytes

export type ReferendumInfo = ReferendumInfo_Approved | ReferendumInfo_Cancelled | ReferendumInfo_Killed | ReferendumInfo_Ongoing | ReferendumInfo_Rejected | ReferendumInfo_TimedOut

export interface ReferendumInfo_Approved {
    __kind: 'Approved'
    value: [number, (Deposit | undefined), (Deposit | undefined)]
}

export interface ReferendumInfo_Cancelled {
    __kind: 'Cancelled'
    value: [number, (Deposit | undefined), (Deposit | undefined)]
}

export interface ReferendumInfo_Killed {
    __kind: 'Killed'
    value: number
}

export interface ReferendumInfo_Ongoing {
    __kind: 'Ongoing'
    value: ReferendumStatus
}

export interface ReferendumInfo_Rejected {
    __kind: 'Rejected'
    value: [number, (Deposit | undefined), (Deposit | undefined)]
}

export interface ReferendumInfo_TimedOut {
    __kind: 'TimedOut'
    value: [number, (Deposit | undefined), (Deposit | undefined)]
}

export interface ReferendumStatus {
    track: number
    origin: OriginCaller
    proposal: Bounded
    enactment: DispatchTime
    submitted: number
    submissionDeposit: Deposit
    decisionDeposit?: (Deposit | undefined)
    deciding?: (DecidingStatus | undefined)
    tally: Tally
    inQueue: boolean
    alarm?: ([number, [number, number]] | undefined)
}

export interface Tally {
    ayes: bigint
    nays: bigint
    support: bigint
}

export interface DecidingStatus {
    since: number
    confirming?: (number | undefined)
}

export type DispatchTime = DispatchTime_After | DispatchTime_At

export interface DispatchTime_After {
    __kind: 'After'
    value: number
}

export interface DispatchTime_At {
    __kind: 'At'
    value: number
}

export type Bounded = Bounded_Inline | Bounded_Legacy | Bounded_Lookup

export interface Bounded_Inline {
    __kind: 'Inline'
    value: Bytes
}

export interface Bounded_Legacy {
    __kind: 'Legacy'
    hash: H256
}

export interface Bounded_Lookup {
    __kind: 'Lookup'
    hash: H256
    len: number
}

export type OriginCaller = OriginCaller_Origins | OriginCaller_Revive | OriginCaller_system

export interface OriginCaller_Origins {
    __kind: 'Origins'
    value: Origin
}

export interface OriginCaller_Revive {
    __kind: 'Revive'
    value: Type_84
}

export interface OriginCaller_system {
    __kind: 'system'
    value: RawOrigin
}

export type RawOrigin = RawOrigin_Authorized | RawOrigin_None | RawOrigin_Root | RawOrigin_Signed

export interface RawOrigin_Authorized {
    __kind: 'Authorized'
}

export interface RawOrigin_None {
    __kind: 'None'
}

export interface RawOrigin_Root {
    __kind: 'Root'
}

export interface RawOrigin_Signed {
    __kind: 'Signed'
    value: AccountId32
}

export type Type_84 = Type_84_EthTransaction

export interface Type_84_EthTransaction {
    __kind: 'EthTransaction'
    value: AccountId32
}

export type Origin = Origin_BigSpender | Origin_IdentityAdmin | Origin_MediumSpender | Origin_ReferendumCanceller | Origin_ReferendumKiller | Origin_RuntimeUpgrade | Origin_SmallSpender | Origin_WishForChange

export interface Origin_BigSpender {
    __kind: 'BigSpender'
}

export interface Origin_IdentityAdmin {
    __kind: 'IdentityAdmin'
}

export interface Origin_MediumSpender {
    __kind: 'MediumSpender'
}

export interface Origin_ReferendumCanceller {
    __kind: 'ReferendumCanceller'
}

export interface Origin_ReferendumKiller {
    __kind: 'ReferendumKiller'
}

export interface Origin_RuntimeUpgrade {
    __kind: 'RuntimeUpgrade'
}

export interface Origin_SmallSpender {
    __kind: 'SmallSpender'
}

export interface Origin_WishForChange {
    __kind: 'WishForChange'
}

export interface Deposit {
    who: AccountId32
    amount: bigint
}

export const ReferendumInfo: sts.Type<ReferendumInfo> = sts.closedEnum(() => {
    return  {
        Approved: sts.tuple(() => [sts.number(), sts.option(() => Deposit), sts.option(() => Deposit)]),
        Cancelled: sts.tuple(() => [sts.number(), sts.option(() => Deposit), sts.option(() => Deposit)]),
        Killed: sts.number(),
        Ongoing: ReferendumStatus,
        Rejected: sts.tuple(() => [sts.number(), sts.option(() => Deposit), sts.option(() => Deposit)]),
        TimedOut: sts.tuple(() => [sts.number(), sts.option(() => Deposit), sts.option(() => Deposit)]),
    }
})

export const ReferendumStatus: sts.Type<ReferendumStatus> = sts.struct(() => {
    return  {
        track: sts.number(),
        origin: OriginCaller,
        proposal: Bounded,
        enactment: DispatchTime,
        submitted: sts.number(),
        submissionDeposit: Deposit,
        decisionDeposit: sts.option(() => Deposit),
        deciding: sts.option(() => DecidingStatus),
        tally: Tally,
        inQueue: sts.boolean(),
        alarm: sts.option(() => sts.tuple(() => [sts.number(), sts.tuple(() => [sts.number(), sts.number()])])),
    }
})

export const Tally: sts.Type<Tally> = sts.struct(() => {
    return  {
        ayes: sts.bigint(),
        nays: sts.bigint(),
        support: sts.bigint(),
    }
})

export const DecidingStatus: sts.Type<DecidingStatus> = sts.struct(() => {
    return  {
        since: sts.number(),
        confirming: sts.option(() => sts.number()),
    }
})

export const DispatchTime: sts.Type<DispatchTime> = sts.closedEnum(() => {
    return  {
        After: sts.number(),
        At: sts.number(),
    }
})

export const Bounded: sts.Type<Bounded> = sts.closedEnum(() => {
    return  {
        Inline: sts.bytes(),
        Legacy: sts.enumStruct({
            hash: H256,
        }),
        Lookup: sts.enumStruct({
            hash: H256,
            len: sts.number(),
        }),
    }
})

export const OriginCaller: sts.Type<OriginCaller> = sts.closedEnum(() => {
    return  {
        Origins: Origin,
        Revive: Type_84,
        system: RawOrigin,
    }
})

export const RawOrigin: sts.Type<RawOrigin> = sts.closedEnum(() => {
    return  {
        Authorized: sts.unit(),
        None: sts.unit(),
        Root: sts.unit(),
        Signed: AccountId32,
    }
})

export const Type_84: sts.Type<Type_84> = sts.closedEnum(() => {
    return  {
        EthTransaction: AccountId32,
    }
})

export const Origin: sts.Type<Origin> = sts.closedEnum(() => {
    return  {
        BigSpender: sts.unit(),
        IdentityAdmin: sts.unit(),
        MediumSpender: sts.unit(),
        ReferendumCanceller: sts.unit(),
        ReferendumKiller: sts.unit(),
        RuntimeUpgrade: sts.unit(),
        SmallSpender: sts.unit(),
        WishForChange: sts.unit(),
    }
})

export const Deposit: sts.Type<Deposit> = sts.struct(() => {
    return  {
        who: AccountId32,
        amount: sts.bigint(),
    }
})

export type AccountId32 = Bytes

export interface IdAmount {
    id: RuntimeHoldReason
    amount: bigint
}

export type RuntimeHoldReason = RuntimeHoldReason_Preimage | RuntimeHoldReason_Revive | RuntimeHoldReason_Session

export interface RuntimeHoldReason_Preimage {
    __kind: 'Preimage'
    value: Type_39
}

export interface RuntimeHoldReason_Revive {
    __kind: 'Revive'
    value: Type_40
}

export interface RuntimeHoldReason_Session {
    __kind: 'Session'
    value: HoldReason
}

export type HoldReason = HoldReason_Keys

export interface HoldReason_Keys {
    __kind: 'Keys'
}

export type Type_40 = Type_40_AddressMapping | Type_40_CodeUploadDepositReserve | Type_40_StorageDepositReserve

export interface Type_40_AddressMapping {
    __kind: 'AddressMapping'
}

export interface Type_40_CodeUploadDepositReserve {
    __kind: 'CodeUploadDepositReserve'
}

export interface Type_40_StorageDepositReserve {
    __kind: 'StorageDepositReserve'
}

export type Type_39 = Type_39_Preimage

export interface Type_39_Preimage {
    __kind: 'Preimage'
}

export const IdAmount: sts.Type<IdAmount> = sts.struct(() => {
    return  {
        id: RuntimeHoldReason,
        amount: sts.bigint(),
    }
})

export const RuntimeHoldReason: sts.Type<RuntimeHoldReason> = sts.closedEnum(() => {
    return  {
        Preimage: Type_39,
        Revive: Type_40,
        Session: HoldReason,
    }
})

export const HoldReason: sts.Type<HoldReason> = sts.closedEnum(() => {
    return  {
        Keys: sts.unit(),
    }
})

export const Type_40: sts.Type<Type_40> = sts.closedEnum(() => {
    return  {
        AddressMapping: sts.unit(),
        CodeUploadDepositReserve: sts.unit(),
        StorageDepositReserve: sts.unit(),
    }
})

export const Type_39: sts.Type<Type_39> = sts.closedEnum(() => {
    return  {
        Preimage: sts.unit(),
    }
})

export const AccountId32 = sts.bytes()

export const DispatchError: sts.Type<DispatchError> = sts.closedEnum(() => {
    return  {
        Arithmetic: ArithmeticError,
        BadOrigin: sts.unit(),
        CannotLookup: sts.unit(),
        ConsumerRemaining: sts.unit(),
        Corruption: sts.unit(),
        Exhausted: sts.unit(),
        Module: ModuleError,
        NoProviders: sts.unit(),
        Other: sts.unit(),
        RootNotAllowed: sts.unit(),
        Token: TokenError,
        TooManyConsumers: sts.unit(),
        Transactional: TransactionalError,
        Trie: TrieError,
        Unavailable: sts.unit(),
    }
})

export const TrieError: sts.Type<TrieError> = sts.closedEnum(() => {
    return  {
        DecodeError: sts.unit(),
        DecoderError: sts.unit(),
        DuplicateKey: sts.unit(),
        ExtraneousHashReference: sts.unit(),
        ExtraneousNode: sts.unit(),
        ExtraneousValue: sts.unit(),
        IncompleteDatabase: sts.unit(),
        IncompleteProof: sts.unit(),
        InvalidChildReference: sts.unit(),
        InvalidHash: sts.unit(),
        InvalidStateRoot: sts.unit(),
        RootMismatch: sts.unit(),
        ValueAtIncompleteKey: sts.unit(),
        ValueMismatch: sts.unit(),
    }
})

export type TrieError = TrieError_DecodeError | TrieError_DecoderError | TrieError_DuplicateKey | TrieError_ExtraneousHashReference | TrieError_ExtraneousNode | TrieError_ExtraneousValue | TrieError_IncompleteDatabase | TrieError_IncompleteProof | TrieError_InvalidChildReference | TrieError_InvalidHash | TrieError_InvalidStateRoot | TrieError_RootMismatch | TrieError_ValueAtIncompleteKey | TrieError_ValueMismatch

export interface TrieError_DecodeError {
    __kind: 'DecodeError'
}

export interface TrieError_DecoderError {
    __kind: 'DecoderError'
}

export interface TrieError_DuplicateKey {
    __kind: 'DuplicateKey'
}

export interface TrieError_ExtraneousHashReference {
    __kind: 'ExtraneousHashReference'
}

export interface TrieError_ExtraneousNode {
    __kind: 'ExtraneousNode'
}

export interface TrieError_ExtraneousValue {
    __kind: 'ExtraneousValue'
}

export interface TrieError_IncompleteDatabase {
    __kind: 'IncompleteDatabase'
}

export interface TrieError_IncompleteProof {
    __kind: 'IncompleteProof'
}

export interface TrieError_InvalidChildReference {
    __kind: 'InvalidChildReference'
}

export interface TrieError_InvalidHash {
    __kind: 'InvalidHash'
}

export interface TrieError_InvalidStateRoot {
    __kind: 'InvalidStateRoot'
}

export interface TrieError_RootMismatch {
    __kind: 'RootMismatch'
}

export interface TrieError_ValueAtIncompleteKey {
    __kind: 'ValueAtIncompleteKey'
}

export interface TrieError_ValueMismatch {
    __kind: 'ValueMismatch'
}

export const TransactionalError: sts.Type<TransactionalError> = sts.closedEnum(() => {
    return  {
        LimitReached: sts.unit(),
        NoLayer: sts.unit(),
    }
})

export type TransactionalError = TransactionalError_LimitReached | TransactionalError_NoLayer

export interface TransactionalError_LimitReached {
    __kind: 'LimitReached'
}

export interface TransactionalError_NoLayer {
    __kind: 'NoLayer'
}

export const TokenError: sts.Type<TokenError> = sts.closedEnum(() => {
    return  {
        BelowMinimum: sts.unit(),
        Blocked: sts.unit(),
        CannotCreate: sts.unit(),
        CannotCreateHold: sts.unit(),
        Frozen: sts.unit(),
        FundsUnavailable: sts.unit(),
        NotExpendable: sts.unit(),
        OnlyProvider: sts.unit(),
        UnknownAsset: sts.unit(),
        Unsupported: sts.unit(),
    }
})

export type TokenError = TokenError_BelowMinimum | TokenError_Blocked | TokenError_CannotCreate | TokenError_CannotCreateHold | TokenError_Frozen | TokenError_FundsUnavailable | TokenError_NotExpendable | TokenError_OnlyProvider | TokenError_UnknownAsset | TokenError_Unsupported

export interface TokenError_BelowMinimum {
    __kind: 'BelowMinimum'
}

export interface TokenError_Blocked {
    __kind: 'Blocked'
}

export interface TokenError_CannotCreate {
    __kind: 'CannotCreate'
}

export interface TokenError_CannotCreateHold {
    __kind: 'CannotCreateHold'
}

export interface TokenError_Frozen {
    __kind: 'Frozen'
}

export interface TokenError_FundsUnavailable {
    __kind: 'FundsUnavailable'
}

export interface TokenError_NotExpendable {
    __kind: 'NotExpendable'
}

export interface TokenError_OnlyProvider {
    __kind: 'OnlyProvider'
}

export interface TokenError_UnknownAsset {
    __kind: 'UnknownAsset'
}

export interface TokenError_Unsupported {
    __kind: 'Unsupported'
}

export const ModuleError: sts.Type<ModuleError> = sts.struct(() => {
    return  {
        index: sts.number(),
        error: sts.bytes(),
    }
})

export interface ModuleError {
    index: number
    error: Bytes
}

export const ArithmeticError: sts.Type<ArithmeticError> = sts.closedEnum(() => {
    return  {
        DivisionByZero: sts.unit(),
        Overflow: sts.unit(),
        Underflow: sts.unit(),
    }
})

export type ArithmeticError = ArithmeticError_DivisionByZero | ArithmeticError_Overflow | ArithmeticError_Underflow

export interface ArithmeticError_DivisionByZero {
    __kind: 'DivisionByZero'
}

export interface ArithmeticError_Overflow {
    __kind: 'Overflow'
}

export interface ArithmeticError_Underflow {
    __kind: 'Underflow'
}

export type DispatchError = DispatchError_Arithmetic | DispatchError_BadOrigin | DispatchError_CannotLookup | DispatchError_ConsumerRemaining | DispatchError_Corruption | DispatchError_Exhausted | DispatchError_Module | DispatchError_NoProviders | DispatchError_Other | DispatchError_RootNotAllowed | DispatchError_Token | DispatchError_TooManyConsumers | DispatchError_Transactional | DispatchError_Trie | DispatchError_Unavailable

export interface DispatchError_Arithmetic {
    __kind: 'Arithmetic'
    value: ArithmeticError
}

export interface DispatchError_BadOrigin {
    __kind: 'BadOrigin'
}

export interface DispatchError_CannotLookup {
    __kind: 'CannotLookup'
}

export interface DispatchError_ConsumerRemaining {
    __kind: 'ConsumerRemaining'
}

export interface DispatchError_Corruption {
    __kind: 'Corruption'
}

export interface DispatchError_Exhausted {
    __kind: 'Exhausted'
}

export interface DispatchError_Module {
    __kind: 'Module'
    value: ModuleError
}

export interface DispatchError_NoProviders {
    __kind: 'NoProviders'
}

export interface DispatchError_Other {
    __kind: 'Other'
}

export interface DispatchError_RootNotAllowed {
    __kind: 'RootNotAllowed'
}

export interface DispatchError_Token {
    __kind: 'Token'
    value: TokenError
}

export interface DispatchError_TooManyConsumers {
    __kind: 'TooManyConsumers'
}

export interface DispatchError_Transactional {
    __kind: 'Transactional'
    value: TransactionalError
}

export interface DispatchError_Trie {
    __kind: 'Trie'
    value: TrieError
}

export interface DispatchError_Unavailable {
    __kind: 'Unavailable'
}

export const H256 = sts.bytes()

export const H160 = sts.bytes()
