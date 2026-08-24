import {sts, Result, Option, Bytes, BitSequence} from './support'

export const H160 = sts.bytes()

export const PalletId = sts.bytes()

export const Origin: sts.Type<Origin> = sts.closedEnum(() => {
    return  {
        BigSpender: sts.unit(),
        MediumSpender: sts.unit(),
        SmallSpender: sts.unit(),
    }
})

export type Origin = Origin_BigSpender | Origin_MediumSpender | Origin_SmallSpender

export interface Origin_BigSpender {
    __kind: 'BigSpender'
}

export interface Origin_MediumSpender {
    __kind: 'MediumSpender'
}

export interface Origin_SmallSpender {
    __kind: 'SmallSpender'
}

export const TrackDetails: sts.Type<TrackDetails> = sts.struct(() => {
    return  {
        name: sts.string(),
        maxDeciding: sts.number(),
        decisionDeposit: sts.bigint(),
        preparePeriod: sts.number(),
        decisionPeriod: sts.number(),
        confirmPeriod: sts.number(),
        minEnactmentPeriod: sts.number(),
        minApproval: Curve,
        minSupport: Curve,
    }
})

export const Curve: sts.Type<Curve> = sts.closedEnum(() => {
    return  {
        LinearDecreasing: sts.enumStruct({
            length: Perbill,
            floor: Perbill,
            ceil: Perbill,
        }),
        Reciprocal: sts.enumStruct({
            factor: FixedI64,
            xOffset: FixedI64,
            yOffset: FixedI64,
        }),
        SteppedDecreasing: sts.enumStruct({
            begin: Perbill,
            end: Perbill,
            step: Perbill,
            period: Perbill,
        }),
    }
})

export const FixedI64 = sts.bigint()

export const Perbill = sts.number()

export type Curve = Curve_LinearDecreasing | Curve_Reciprocal | Curve_SteppedDecreasing

export interface Curve_LinearDecreasing {
    __kind: 'LinearDecreasing'
    length: Perbill
    floor: Perbill
    ceil: Perbill
}

export interface Curve_Reciprocal {
    __kind: 'Reciprocal'
    factor: FixedI64
    xOffset: FixedI64
    yOffset: FixedI64
}

export interface Curve_SteppedDecreasing {
    __kind: 'SteppedDecreasing'
    begin: Perbill
    end: Perbill
    step: Perbill
    period: Perbill
}

export type FixedI64 = bigint

export type Perbill = number

export interface TrackDetails {
    name: string
    maxDeciding: number
    decisionDeposit: bigint
    preparePeriod: number
    decisionPeriod: number
    confirmPeriod: number
    minEnactmentPeriod: number
    minApproval: Curve
    minSupport: Curve
}

export type ReceiptV4 = ReceiptV4_EIP1559 | ReceiptV4_EIP2930 | ReceiptV4_EIP7702 | ReceiptV4_Legacy

export interface ReceiptV4_EIP1559 {
    __kind: 'EIP1559'
    value: EIP658ReceiptData
}

export interface ReceiptV4_EIP2930 {
    __kind: 'EIP2930'
    value: EIP658ReceiptData
}

export interface ReceiptV4_EIP7702 {
    __kind: 'EIP7702'
    value: EIP658ReceiptData
}

export interface ReceiptV4_Legacy {
    __kind: 'Legacy'
    value: EIP658ReceiptData
}

export interface EIP658ReceiptData {
    statusCode: number
    usedGas: bigint
    logsBloom: Bloom
    logs: Log[]
}

export interface Log {
    address: H160
    topics: H256[]
    data: Bytes
}

export type H256 = Bytes

export type H160 = Bytes

export type Bloom = Bytes

export const ReceiptV4: sts.Type<ReceiptV4> = sts.closedEnum(() => {
    return  {
        EIP1559: EIP658ReceiptData,
        EIP2930: EIP658ReceiptData,
        EIP7702: EIP658ReceiptData,
        Legacy: EIP658ReceiptData,
    }
})

export const EIP658ReceiptData: sts.Type<EIP658ReceiptData> = sts.struct(() => {
    return  {
        statusCode: sts.number(),
        usedGas: sts.bigint(),
        logsBloom: Bloom,
        logs: sts.array(() => Log),
    }
})

export const Log: sts.Type<Log> = sts.struct(() => {
    return  {
        address: H160,
        topics: sts.array(() => H256),
        data: sts.bytes(),
    }
})

export const H256 = sts.bytes()

export const Bloom = sts.bytes()

export interface ChildBounty {
    parentBounty: number
    value: bigint
    fee: bigint
    curatorDeposit: bigint
    status: ChildBountyStatus
}

export type ChildBountyStatus = ChildBountyStatus_Active | ChildBountyStatus_Added | ChildBountyStatus_CuratorProposed | ChildBountyStatus_PendingPayout

export interface ChildBountyStatus_Active {
    __kind: 'Active'
    curator: AccountId32
}

export interface ChildBountyStatus_Added {
    __kind: 'Added'
}

export interface ChildBountyStatus_CuratorProposed {
    __kind: 'CuratorProposed'
    curator: AccountId32
}

export interface ChildBountyStatus_PendingPayout {
    __kind: 'PendingPayout'
    curator: AccountId32
    beneficiary: AccountId32
    unlockAt: number
}

export const ChildBounty: sts.Type<ChildBounty> = sts.struct(() => {
    return  {
        parentBounty: sts.number(),
        value: sts.bigint(),
        fee: sts.bigint(),
        curatorDeposit: sts.bigint(),
        status: ChildBountyStatus,
    }
})

export const ChildBountyStatus: sts.Type<ChildBountyStatus> = sts.closedEnum(() => {
    return  {
        Active: sts.enumStruct({
            curator: AccountId32,
        }),
        Added: sts.unit(),
        CuratorProposed: sts.enumStruct({
            curator: AccountId32,
        }),
        PendingPayout: sts.enumStruct({
            curator: AccountId32,
            beneficiary: AccountId32,
            unlockAt: sts.number(),
        }),
    }
})

export interface Bounty {
    proposer: AccountId32
    value: bigint
    fee: bigint
    curatorDeposit: bigint
    bond: bigint
    status: BountyStatus
}

export type BountyStatus = BountyStatus_Active | BountyStatus_Approved | BountyStatus_ApprovedWithCurator | BountyStatus_CuratorProposed | BountyStatus_Funded | BountyStatus_PendingPayout | BountyStatus_Proposed

export interface BountyStatus_Active {
    __kind: 'Active'
    curator: AccountId32
    updateDue: number
}

export interface BountyStatus_Approved {
    __kind: 'Approved'
}

export interface BountyStatus_ApprovedWithCurator {
    __kind: 'ApprovedWithCurator'
    curator: AccountId32
}

export interface BountyStatus_CuratorProposed {
    __kind: 'CuratorProposed'
    curator: AccountId32
}

export interface BountyStatus_Funded {
    __kind: 'Funded'
}

export interface BountyStatus_PendingPayout {
    __kind: 'PendingPayout'
    curator: AccountId32
    beneficiary: AccountId32
    unlockAt: number
}

export interface BountyStatus_Proposed {
    __kind: 'Proposed'
}

export const Bounty: sts.Type<Bounty> = sts.struct(() => {
    return  {
        proposer: AccountId32,
        value: sts.bigint(),
        fee: sts.bigint(),
        curatorDeposit: sts.bigint(),
        bond: sts.bigint(),
        status: BountyStatus,
    }
})

export const BountyStatus: sts.Type<BountyStatus> = sts.closedEnum(() => {
    return  {
        Active: sts.enumStruct({
            curator: AccountId32,
            updateDue: sts.number(),
        }),
        Approved: sts.unit(),
        ApprovedWithCurator: sts.enumStruct({
            curator: AccountId32,
        }),
        CuratorProposed: sts.enumStruct({
            curator: AccountId32,
        }),
        Funded: sts.unit(),
        PendingPayout: sts.enumStruct({
            curator: AccountId32,
            beneficiary: AccountId32,
            unlockAt: sts.number(),
        }),
        Proposed: sts.unit(),
    }
})

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

export type OriginCaller = OriginCaller_Ethereum | OriginCaller_Origins | OriginCaller_system

export interface OriginCaller_Ethereum {
    __kind: 'Ethereum'
    value: Type_83
}

export interface OriginCaller_Origins {
    __kind: 'Origins'
    value: Origin
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

export type Type_83 = Type_83_EthereumTransaction

export interface Type_83_EthereumTransaction {
    __kind: 'EthereumTransaction'
    value: H160
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
        Ethereum: Type_83,
        Origins: Origin,
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

export const Type_83: sts.Type<Type_83> = sts.closedEnum(() => {
    return  {
        EthereumTransaction: H160,
    }
})

export const Deposit: sts.Type<Deposit> = sts.struct(() => {
    return  {
        who: AccountId32,
        amount: sts.bigint(),
    }
})

export type Voting = Voting_Casting | Voting_Delegating

export interface Voting_Casting {
    __kind: 'Casting'
    value: Casting
}

export interface Voting_Delegating {
    __kind: 'Delegating'
    value: Delegating
}

export interface Delegating {
    balance: bigint
    target: AccountId32
    conviction: Conviction
    delegations: Delegations
    prior: PriorLock
}

export type PriorLock = [number, bigint]

export interface Delegations {
    votes: bigint
    capital: bigint
}

export type Conviction = Conviction_Locked1x | Conviction_Locked2x | Conviction_Locked3x | Conviction_Locked4x | Conviction_Locked5x | Conviction_Locked6x | Conviction_None

export interface Conviction_Locked1x {
    __kind: 'Locked1x'
}

export interface Conviction_Locked2x {
    __kind: 'Locked2x'
}

export interface Conviction_Locked3x {
    __kind: 'Locked3x'
}

export interface Conviction_Locked4x {
    __kind: 'Locked4x'
}

export interface Conviction_Locked5x {
    __kind: 'Locked5x'
}

export interface Conviction_Locked6x {
    __kind: 'Locked6x'
}

export interface Conviction_None {
    __kind: 'None'
}

export interface Casting {
    votes: [number, AccountVote][]
    delegations: Delegations
    prior: PriorLock
}

export type AccountVote = AccountVote_Split | AccountVote_SplitAbstain | AccountVote_Standard

export interface AccountVote_Split {
    __kind: 'Split'
    aye: bigint
    nay: bigint
}

export interface AccountVote_SplitAbstain {
    __kind: 'SplitAbstain'
    aye: bigint
    nay: bigint
    abstain: bigint
}

export interface AccountVote_Standard {
    __kind: 'Standard'
    vote: Vote
    balance: bigint
}

export type Vote = number

export const Voting: sts.Type<Voting> = sts.closedEnum(() => {
    return  {
        Casting: Casting,
        Delegating: Delegating,
    }
})

export const Delegating: sts.Type<Delegating> = sts.struct(() => {
    return  {
        balance: sts.bigint(),
        target: AccountId32,
        conviction: Conviction,
        delegations: Delegations,
        prior: PriorLock,
    }
})

export const PriorLock = sts.tuple(() => [sts.number(), sts.bigint()])

export const Delegations: sts.Type<Delegations> = sts.struct(() => {
    return  {
        votes: sts.bigint(),
        capital: sts.bigint(),
    }
})

export const Conviction: sts.Type<Conviction> = sts.closedEnum(() => {
    return  {
        Locked1x: sts.unit(),
        Locked2x: sts.unit(),
        Locked3x: sts.unit(),
        Locked4x: sts.unit(),
        Locked5x: sts.unit(),
        Locked6x: sts.unit(),
        None: sts.unit(),
    }
})

export const Casting: sts.Type<Casting> = sts.struct(() => {
    return  {
        votes: sts.array(() => sts.tuple(() => [sts.number(), AccountVote])),
        delegations: Delegations,
        prior: PriorLock,
    }
})

export const AccountVote: sts.Type<AccountVote> = sts.closedEnum(() => {
    return  {
        Split: sts.enumStruct({
            aye: sts.bigint(),
            nay: sts.bigint(),
        }),
        SplitAbstain: sts.enumStruct({
            aye: sts.bigint(),
            nay: sts.bigint(),
            abstain: sts.bigint(),
        }),
        Standard: sts.enumStruct({
            vote: Vote,
            balance: sts.bigint(),
        }),
    }
})

export const Vote = sts.number()

export interface UsernameInformation {
    owner: AccountId32
    provider: Provider
}

export type Provider = Provider_Allocation | Provider_AuthorityDeposit | Provider_System

export interface Provider_Allocation {
    __kind: 'Allocation'
}

export interface Provider_AuthorityDeposit {
    __kind: 'AuthorityDeposit'
    value: bigint
}

export interface Provider_System {
    __kind: 'System'
}

export const UsernameInformation: sts.Type<UsernameInformation> = sts.struct(() => {
    return  {
        owner: AccountId32,
        provider: Provider,
    }
})

export const Provider: sts.Type<Provider> = sts.closedEnum(() => {
    return  {
        Allocation: sts.unit(),
        AuthorityDeposit: sts.bigint(),
        System: sts.unit(),
    }
})

export interface AuthorityProperties {
    accountId: AccountId32
    allocation: number
}

export const AuthorityProperties: sts.Type<AuthorityProperties> = sts.struct(() => {
    return  {
        accountId: AccountId32,
        allocation: sts.number(),
    }
})

export interface RegistrarInfo {
    account: AccountId32
    fee: bigint
    fields: bigint
}

export const RegistrarInfo: sts.Type<RegistrarInfo> = sts.struct(() => {
    return  {
        account: AccountId32,
        fee: sts.bigint(),
        fields: sts.bigint(),
    }
})

export type Data = Data_BlakeTwo256 | Data_Keccak256 | Data_None | Data_Raw0 | Data_Raw1 | Data_Raw10 | Data_Raw11 | Data_Raw12 | Data_Raw13 | Data_Raw14 | Data_Raw15 | Data_Raw16 | Data_Raw17 | Data_Raw18 | Data_Raw19 | Data_Raw2 | Data_Raw20 | Data_Raw21 | Data_Raw22 | Data_Raw23 | Data_Raw24 | Data_Raw25 | Data_Raw26 | Data_Raw27 | Data_Raw28 | Data_Raw29 | Data_Raw3 | Data_Raw30 | Data_Raw31 | Data_Raw32 | Data_Raw4 | Data_Raw5 | Data_Raw6 | Data_Raw7 | Data_Raw8 | Data_Raw9 | Data_Sha256 | Data_ShaThree256

export interface Data_BlakeTwo256 {
    __kind: 'BlakeTwo256'
    value: Bytes
}

export interface Data_Keccak256 {
    __kind: 'Keccak256'
    value: Bytes
}

export interface Data_None {
    __kind: 'None'
}

export interface Data_Raw0 {
    __kind: 'Raw0'
    value: Bytes
}

export interface Data_Raw1 {
    __kind: 'Raw1'
    value: Bytes
}

export interface Data_Raw10 {
    __kind: 'Raw10'
    value: Bytes
}

export interface Data_Raw11 {
    __kind: 'Raw11'
    value: Bytes
}

export interface Data_Raw12 {
    __kind: 'Raw12'
    value: Bytes
}

export interface Data_Raw13 {
    __kind: 'Raw13'
    value: Bytes
}

export interface Data_Raw14 {
    __kind: 'Raw14'
    value: Bytes
}

export interface Data_Raw15 {
    __kind: 'Raw15'
    value: Bytes
}

export interface Data_Raw16 {
    __kind: 'Raw16'
    value: Bytes
}

export interface Data_Raw17 {
    __kind: 'Raw17'
    value: Bytes
}

export interface Data_Raw18 {
    __kind: 'Raw18'
    value: Bytes
}

export interface Data_Raw19 {
    __kind: 'Raw19'
    value: Bytes
}

export interface Data_Raw2 {
    __kind: 'Raw2'
    value: Bytes
}

export interface Data_Raw20 {
    __kind: 'Raw20'
    value: Bytes
}

export interface Data_Raw21 {
    __kind: 'Raw21'
    value: Bytes
}

export interface Data_Raw22 {
    __kind: 'Raw22'
    value: Bytes
}

export interface Data_Raw23 {
    __kind: 'Raw23'
    value: Bytes
}

export interface Data_Raw24 {
    __kind: 'Raw24'
    value: Bytes
}

export interface Data_Raw25 {
    __kind: 'Raw25'
    value: Bytes
}

export interface Data_Raw26 {
    __kind: 'Raw26'
    value: Bytes
}

export interface Data_Raw27 {
    __kind: 'Raw27'
    value: Bytes
}

export interface Data_Raw28 {
    __kind: 'Raw28'
    value: Bytes
}

export interface Data_Raw29 {
    __kind: 'Raw29'
    value: Bytes
}

export interface Data_Raw3 {
    __kind: 'Raw3'
    value: Bytes
}

export interface Data_Raw30 {
    __kind: 'Raw30'
    value: Bytes
}

export interface Data_Raw31 {
    __kind: 'Raw31'
    value: Bytes
}

export interface Data_Raw32 {
    __kind: 'Raw32'
    value: Bytes
}

export interface Data_Raw4 {
    __kind: 'Raw4'
    value: Bytes
}

export interface Data_Raw5 {
    __kind: 'Raw5'
    value: Bytes
}

export interface Data_Raw6 {
    __kind: 'Raw6'
    value: Bytes
}

export interface Data_Raw7 {
    __kind: 'Raw7'
    value: Bytes
}

export interface Data_Raw8 {
    __kind: 'Raw8'
    value: Bytes
}

export interface Data_Raw9 {
    __kind: 'Raw9'
    value: Bytes
}

export interface Data_Sha256 {
    __kind: 'Sha256'
    value: Bytes
}

export interface Data_ShaThree256 {
    __kind: 'ShaThree256'
    value: Bytes
}

export const Data: sts.Type<Data> = sts.closedEnum(() => {
    return  {
        BlakeTwo256: sts.bytes(),
        Keccak256: sts.bytes(),
        None: sts.unit(),
        Raw0: sts.bytes(),
        Raw1: sts.bytes(),
        Raw10: sts.bytes(),
        Raw11: sts.bytes(),
        Raw12: sts.bytes(),
        Raw13: sts.bytes(),
        Raw14: sts.bytes(),
        Raw15: sts.bytes(),
        Raw16: sts.bytes(),
        Raw17: sts.bytes(),
        Raw18: sts.bytes(),
        Raw19: sts.bytes(),
        Raw2: sts.bytes(),
        Raw20: sts.bytes(),
        Raw21: sts.bytes(),
        Raw22: sts.bytes(),
        Raw23: sts.bytes(),
        Raw24: sts.bytes(),
        Raw25: sts.bytes(),
        Raw26: sts.bytes(),
        Raw27: sts.bytes(),
        Raw28: sts.bytes(),
        Raw29: sts.bytes(),
        Raw3: sts.bytes(),
        Raw30: sts.bytes(),
        Raw31: sts.bytes(),
        Raw32: sts.bytes(),
        Raw4: sts.bytes(),
        Raw5: sts.bytes(),
        Raw6: sts.bytes(),
        Raw7: sts.bytes(),
        Raw8: sts.bytes(),
        Raw9: sts.bytes(),
        Sha256: sts.bytes(),
        ShaThree256: sts.bytes(),
    }
})

export type BoundedVec = Bytes

export const BoundedVec = sts.bytes()

export interface Registration {
    judgements: [number, Judgement][]
    deposit: bigint
    info: IdentityInfo
}

export interface IdentityInfo {
    display: Data
    web: Data
    email: Data
    matrix: Data
    github: Data
    x: Data
    telegram: Data
    discord: Data
}

export type Judgement = Judgement_Erroneous | Judgement_FeePaid | Judgement_KnownGood | Judgement_LowQuality | Judgement_OutOfDate | Judgement_Reasonable | Judgement_Unknown

export interface Judgement_Erroneous {
    __kind: 'Erroneous'
}

export interface Judgement_FeePaid {
    __kind: 'FeePaid'
    value: bigint
}

export interface Judgement_KnownGood {
    __kind: 'KnownGood'
}

export interface Judgement_LowQuality {
    __kind: 'LowQuality'
}

export interface Judgement_OutOfDate {
    __kind: 'OutOfDate'
}

export interface Judgement_Reasonable {
    __kind: 'Reasonable'
}

export interface Judgement_Unknown {
    __kind: 'Unknown'
}

export const Registration: sts.Type<Registration> = sts.struct(() => {
    return  {
        judgements: sts.array(() => sts.tuple(() => [sts.number(), Judgement])),
        deposit: sts.bigint(),
        info: IdentityInfo,
    }
})

export const IdentityInfo: sts.Type<IdentityInfo> = sts.struct(() => {
    return  {
        display: Data,
        web: Data,
        email: Data,
        matrix: Data,
        github: Data,
        x: Data,
        telegram: Data,
        discord: Data,
    }
})

export const Judgement: sts.Type<Judgement> = sts.closedEnum(() => {
    return  {
        Erroneous: sts.unit(),
        FeePaid: sts.bigint(),
        KnownGood: sts.unit(),
        LowQuality: sts.unit(),
        OutOfDate: sts.unit(),
        Reasonable: sts.unit(),
        Unknown: sts.unit(),
    }
})

export interface VestingInfo {
    locked: bigint
    perBlock: bigint
    startingBlock: number
}

export const VestingInfo: sts.Type<VestingInfo> = sts.struct(() => {
    return  {
        locked: sts.bigint(),
        perBlock: sts.bigint(),
        startingBlock: sts.number(),
    }
})

export interface Announcement {
    real: AccountId32
    callHash: H256
    height: number
}

export const Announcement: sts.Type<Announcement> = sts.struct(() => {
    return  {
        real: AccountId32,
        callHash: H256,
        height: sts.number(),
    }
})

export interface ProxyDefinition {
    delegate: AccountId32
    proxyType: ProxyType
    delay: number
}

export type ProxyType = ProxyType_Any | ProxyType_Governance | ProxyType_NonTransfer

export interface ProxyType_Any {
    __kind: 'Any'
}

export interface ProxyType_Governance {
    __kind: 'Governance'
}

export interface ProxyType_NonTransfer {
    __kind: 'NonTransfer'
}

export const ProxyDefinition: sts.Type<ProxyDefinition> = sts.struct(() => {
    return  {
        delegate: AccountId32,
        proxyType: ProxyType,
        delay: sts.number(),
    }
})

export const ProxyType: sts.Type<ProxyType> = sts.closedEnum(() => {
    return  {
        Any: sts.unit(),
        Governance: sts.unit(),
        NonTransfer: sts.unit(),
    }
})

export interface Multisig {
    when: Timepoint
    deposit: bigint
    depositor: AccountId32
    approvals: AccountId32[]
}

export interface Timepoint {
    height: number
    index: number
}

export const Multisig: sts.Type<Multisig> = sts.struct(() => {
    return  {
        when: Timepoint,
        deposit: sts.bigint(),
        depositor: AccountId32,
        approvals: sts.array(() => AccountId32),
    }
})

export const Timepoint: sts.Type<Timepoint> = sts.struct(() => {
    return  {
        height: sts.number(),
        index: sts.number(),
    }
})

export interface IdAmount {
    id: RuntimeHoldReason
    amount: bigint
}

export type RuntimeHoldReason = RuntimeHoldReason_Preimage | RuntimeHoldReason_Session

export interface RuntimeHoldReason_Preimage {
    __kind: 'Preimage'
    value: Type_39
}

export interface RuntimeHoldReason_Session {
    __kind: 'Session'
    value: HoldReason
}

export type HoldReason = HoldReason_Keys

export interface HoldReason_Keys {
    __kind: 'Keys'
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
        Session: HoldReason,
    }
})

export const HoldReason: sts.Type<HoldReason> = sts.closedEnum(() => {
    return  {
        Keys: sts.unit(),
    }
})

export const Type_39: sts.Type<Type_39> = sts.closedEnum(() => {
    return  {
        Preimage: sts.unit(),
    }
})

export interface BalanceLock {
    id: Bytes
    amount: bigint
    reasons: Reasons
}

export type Reasons = Reasons_All | Reasons_Fee | Reasons_Misc

export interface Reasons_All {
    __kind: 'All'
}

export interface Reasons_Fee {
    __kind: 'Fee'
}

export interface Reasons_Misc {
    __kind: 'Misc'
}

export const BalanceLock: sts.Type<BalanceLock> = sts.struct(() => {
    return  {
        id: sts.bytes(),
        amount: sts.bigint(),
        reasons: Reasons,
    }
})

export const Reasons: sts.Type<Reasons> = sts.closedEnum(() => {
    return  {
        All: sts.unit(),
        Fee: sts.unit(),
        Misc: sts.unit(),
    }
})

export type AccountId32 = Bytes

export interface AccountInfo {
    nonce: number
    consumers: number
    providers: number
    sufficients: number
    data: AccountData
}

export interface AccountData {
    free: bigint
    reserved: bigint
    frozen: bigint
    flags: ExtraFlags
}

export type ExtraFlags = bigint

export const AccountInfo: sts.Type<AccountInfo> = sts.struct(() => {
    return  {
        nonce: sts.number(),
        consumers: sts.number(),
        providers: sts.number(),
        sufficients: sts.number(),
        data: AccountData,
    }
})

export const AccountData: sts.Type<AccountData> = sts.struct(() => {
    return  {
        free: sts.bigint(),
        reserved: sts.bigint(),
        frozen: sts.bigint(),
        flags: ExtraFlags,
    }
})

export const ExtraFlags = sts.bigint()

export const AccountId32 = sts.bytes()
