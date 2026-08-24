import {
    Account,
    Block,
    Call,
    CallKind,
    Bounty,
    ChildBounty,
    DailyStat,
    Delegation,
    Event,
    EvmLog,
    EvmTransaction,
    Extrinsic,
    MinedObject,
    MinerDayStat,
    MultisigOp,
    PrimeState,
    Judgement,
    ProxyRelation,
    Referendum,
    Registrar,
    Token,
    TokenHolder,
    TokenTransfer,
    Transfer,
    TreasurySpend,
    Validator,
    Vote,
} from './model'
import {DecodedErc20Transfer} from './evm'
import {MsigEvent} from './multisig'
import {BountyEvent} from './bounties'

export interface GovEvent {
    name: string
    args: any
    height: number
    signer?: string
    callArgs?: any
}

export interface DayDelta {
    blocks: number
    extrinsicsSigned: number
    transfers: number
    transferVolume: bigint
    evmTxs: number
    fees: bigint
    referendaNew: number
    tsFirst: Date
    tsLast: Date
    difficultyClose: bigint
}

export class BatchData {
    accounts = new Map<string, Account>()
    blocks: Block[] = []
    extrinsics: Extrinsic[] = []
    extrinsicById = new Map<string, Extrinsic>()
    events: Event[] = []
    calls: Call[] = []
    callById = new Map<string, Call>()
    callKinds = new Map<string, CallKind>()
    transfers: Transfer[] = []
    objects: MinedObject[] = []
    evmTxs: EvmTransaction[] = []
    evmLogs: EvmLog[] = []
    erc20Queue: Array<DecodedErc20Transfer & {id: string; tx: EvmTransaction; block: Block; timestamp: Date}> = []
    tokens: Token[] = []
    holders: TokenHolder[] = []
    tokenTransfers: TokenTransfer[] = []
    govEvents: GovEvent[] = []
    referenda = new Map<number, Referendum>()
    votes = new Map<string, Vote>()
    spends = new Map<string, TreasurySpend>()
    // scheduler task id to referendum index, and the spends still waiting for
    // the dispatch event that names their referendum
    enactments = new Map<string, number>()
    spendsAtHeight = new Map<number, string[]>()
    validators = new Map<string, Validator>()
    sessionBoundaries: {index: number; height: number}[] = []
    registrarsDirty = false
    registrarAdded = new Map<number, number>()
    judgementsGiven: {id: string; registrar: number; target: string; block: number; at: Date}[] = []
    judgements: Judgement[] = []
    registrarStats = new Map<number, {requests: number; given: number; block: number; at: Date}>()
    registrars: Registrar[] = []
    identityRefresh = new Set<string>()
    superRefresh = new Set<string>()
    subsReset = new Set<string>()
    vestingRefresh = new Set<string>()
    usernameRefresh = new Set<string>()
    usernameDrop = new Set<string>()
    primeChanged: number | undefined
    prime: PrimeState | undefined
    delegationRefresh = new Map<string, number>()
    delegations: Delegation[] = []
    delegationRemovals: string[] = []
    msigEvents: MsigEvent[] = []
    msigOps = new Map<string, MultisigOp>()
    msigCalls = new Map<string, {threshold: number; signatories: string[]}[]>()
    msigPokes: {depositor: string; callHash: string}[] = []
    proxyRefresh = new Set<string>()
    proxyRelations: ProxyRelation[] = []
    proxyRemovals: string[] = []
    bountyEvents: BountyEvent[] = []
    bounties = new Map<string, Bounty>()
    childBounties = new Map<string, ChildBounty>()
    childRefresh = new Set<string>()
    // ids the account merge found missing from the store, so the day they were
    // first touched is the day they were born
    newAccounts = new Set<string>()
    dayDeltas = new Map<string, DayDelta>()
    days: DailyStat[] = []
    minerDayDeltas = new Map<string, {day: string; account: string; blocks: number; rewards: bigint}>()
    minerDays: MinerDayStat[] = []

    touch(id: string, height: number): Account {
        let a = this.accounts.get(id)
        if (a == null) {
            a = new Account({id, free: 0n, reserved: 0n, frozen: 0n, nonce: 0, firstSeenBlock: height, lastActiveBlock: height})
            this.accounts.set(id, a)
        }
        a.lastActiveBlock = height
        return a
    }
}
