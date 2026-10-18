import type {ActionKind, ActionMove, DelegationSort, DelegationSortBy} from './actionFilters'
import {weigh, type VoteShape} from './conviction'
import {isH256} from './evm'
import {BAD_JUDGEMENTS, GOOD_JUDGEMENTS} from './identity'
import {ss58TryDecode} from './ss58'

const GQL = process.env.GQL_HTTP ?? 'http://127.0.0.1:4350/graphql'

export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(GQL, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({query, variables}),
        cache: 'no-store',
    })
    if (!res.ok) throw new Error(`graphql http ${res.status}`)
    const json = (await res.json()) as {data?: T; errors?: {message: string}[]}
    if (json.errors?.length) throw new Error(`graphql ${json.errors[0].message}`)
    if (!json.data) throw new Error('graphql empty response')
    return json.data
}

export interface AccountRef {
    id: string
    identityDisplay: string | null
    identityJson?: unknown
    identitySubName?: string | null
    identitySubData?: unknown
    identitySuper?: {identityDisplay: string | null; identityJson?: unknown} | null
    username?: string | null
}

export interface BlockRow {
    id: string
    height: number
    hash: string
    parentHash: string
    timestamp: string | null
    finalized: boolean
    extrinsicCount: number
    eventCount: number
    logs?: string[]
    difficulty: string
    reward: string
    minerFees: string
    treasuryFees: string
    nonce: string | null
    workHash: string | null
    specVersion: number
    author: AccountRef | null
}

export interface ObjectRow {
    block: {
        height: number
        hash: string
        timestamp: string
        finalized: boolean
        extrinsicCount: number
        eventCount: number
        workHash: string | null
        author: AccountRef | null
    }
    protocol: string
    vertices: string
}

export interface TopologyRow {
    id: string
    faces: string
}

async function withTopology<T extends {protocol: string}>(objects: T[]) {
    const {meshTopologies} = await gql<{meshTopologies: TopologyRow[]}>(`query ($ids: [String!]!) { meshTopologies(where: {id_in: $ids}) { id faces } }`, {ids: objects.map(o => o.protocol)})
    return objects.map(o => ({...o, topology: meshTopologies.find(t => t.id === o.protocol)!}))
}

export interface CallRef {
    pallet: string
    method: string
}

export interface CallCount extends CallRef {
    count: number
}

export interface TransferRow {
    id: string
    amount: string
    timestamp: string
    call: CallRef | null
    from: AccountRef
    to: AccountRef
    block: {height: number}
    extrinsic: {id: string} | null
}

export interface DailyRow {
    id: string
    date: string
    blocks: number
    extrinsicsSigned: number
    transfers: number
    transferVolume: string
    evmTxs: number
    fees: string
    tsFirst: string
    tsLast: string
    issuanceTotal: string
    issuanceInactive: string
    issuanceTransferable: string
    treasuryPot: string
    cumExtrinsicsSigned: string
    cumTransfers: string
    cumTransferVolume: string
    difficultyClose: string
    accountsTotal: number
    referendaTotal: number
    minersActive: number
    rewards: string
}

// every list that shows an account shows the same identity trimmings
const IDENTITY_REF = `id identityDisplay identityJson identitySubName identitySubData identitySuper { identityDisplay identityJson }`
const ACCOUNT_REF = `${IDENTITY_REF} username`

const BLOCK_FIELDS = `id height hash parentHash timestamp finalized extrinsicCount eventCount difficulty reward minerFees treasuryFees nonce workHash specVersion author { ${ACCOUNT_REF} }`
const TRANSFER_FIELDS = `id amount timestamp call { pallet method } from { ${ACCOUNT_REF} } to { ${ACCOUNT_REF} } block { height } extrinsic { id }`
const BASELINE_FIELDS = `difficulty issuanceTotal issuanceInactive treasuryPot`
const DAILY_FIELDS = `id date blocks extrinsicsSigned transfers transferVolume evmTxs fees tsFirst tsLast issuanceTotal issuanceInactive issuanceTransferable treasuryPot cumExtrinsicsSigned cumTransfers cumTransferVolume difficultyClose accountsTotal referendaTotal minersActive rewards`

// a transfer is keyed by the event that raised it, so id order is event order
const TRANSFER_ORDER = '[timestamp_DESC, id_DESC]'

export interface BaselineRow {
    difficulty: string
    issuanceTotal: string
    issuanceInactive: string
    treasuryPot: string
}

export interface HourlyRow {
    issuanceTransferable: string
    issuanceInactive: string
}

export interface HomeData {
    blocks: BlockRow[]
    genesis: {hash: string}[]
    minedObjects: ObjectRow[]
    transfers: TransferRow[]
    dailyStats: DailyRow[]
    accounts: {totalCount: number}
    validators: {totalCount: number}
    sessionHead: {lastActiveSession: number | null}[]
    evmTotal: {totalCount: number}
    referendums: ReferendumRow[]
    fresh24: {totalCount: number}
    fresh30: {totalCount: number}
    base24: BaselineRow[]
    base30: BaselineRow[]
    tra24: HourlyRow[]
    tra30: HourlyRow[]
    miners24: {totalCount: number}
    miners30: {totalCount: number}
    minersTotal: {totalCount: number}
    ext24: {totalCount: number}
    ext30: {totalCount: number}
    transfers24: {totalCount: number}
    transfers30: {totalCount: number}
    evm24: {totalCount: number}
    evm30: {totalCount: number}
}

export async function homeData(since24: string | null, since30: string | null) {
    const data = await gql<HomeData>(
        `query ($since24: DateTime, $since30: DateTime) {
            blocks(orderBy: height_DESC, limit: 1) { ${BLOCK_FIELDS} }
            genesis: blocks(where: {height_eq: 0}, limit: 1) { hash }
            minedObjects(orderBy: id_DESC, limit: 5) { block { height hash timestamp finalized extrinsicCount eventCount workHash author { ${ACCOUNT_REF} } } protocol vertices }
            transfers(orderBy: ${TRANSFER_ORDER}, limit: 5) { ${TRANSFER_FIELDS} }
            dailyStats(orderBy: date_DESC, limit: 90) { ${DAILY_FIELDS} }
            accounts: accountsConnection(orderBy: id_ASC) { totalCount }
            validators: validatorsConnection(orderBy: id_ASC, where: {active_eq: true}) { totalCount }
            sessionHead: validators(orderBy: lastActiveSession_DESC_NULLS_LAST, limit: 1) { lastActiveSession }
            evmTotal: evmTransactionsConnection(orderBy: id_ASC) { totalCount }
            referendums(orderBy: index_DESC, limit: 5) { ${REFERENDUM_FIELDS} }
            fresh24: accountsConnection(orderBy: id_ASC, where: {firstSeenTimestamp_gt: $since24}) { totalCount }
            fresh30: accountsConnection(orderBy: id_ASC, where: {firstSeenTimestamp_gt: $since30}) { totalCount }
            base24: blocks(orderBy: timestamp_DESC, limit: 1, where: {timestamp_lte: $since24}) { ${BASELINE_FIELDS} }
            base30: blocks(orderBy: timestamp_DESC, limit: 1, where: {timestamp_lte: $since30}) { ${BASELINE_FIELDS} }
            tra24: hourlyStats(orderBy: hour_DESC, limit: 1, where: {block: {timestamp_lte: $since24}}) { issuanceTransferable issuanceInactive }
            tra30: hourlyStats(orderBy: hour_DESC, limit: 1, where: {block: {timestamp_lte: $since30}}) { issuanceTransferable issuanceInactive }
            miners24: accountsConnection(orderBy: id_ASC, where: {lastMinedTimestamp_gt: $since24}) { totalCount }
            miners30: accountsConnection(orderBy: id_ASC, where: {lastMinedTimestamp_gt: $since30}) { totalCount }
            minersTotal: accountsConnection(orderBy: id_ASC, where: {lastMinedTimestamp_isNull: false}) { totalCount }
            ext24: extrinsicsConnection(orderBy: id_ASC, where: {signer_isNull: false, block: {timestamp_gt: $since24}}) { totalCount }
            ext30: extrinsicsConnection(orderBy: id_ASC, where: {signer_isNull: false, block: {timestamp_gt: $since30}}) { totalCount }
            transfers24: transfersConnection(orderBy: id_ASC, where: {timestamp_gt: $since24}) { totalCount }
            transfers30: transfersConnection(orderBy: id_ASC, where: {timestamp_gt: $since30}) { totalCount }
            evm24: evmTransactionsConnection(orderBy: id_ASC, where: {timestamp_gt: $since24}) { totalCount }
            evm30: evmTransactionsConnection(orderBy: id_ASC, where: {timestamp_gt: $since30}) { totalCount }
        }`,
        {since24, since30}
    )
    return {...data, minedObjects: await withTopology(data.minedObjects)}
}

export interface MinedBlockRow {
    id: string
    height: number
    hash: string
    timestamp: string
    reward: string
    minerFees: string
}

export function minedBlocks(authorHex: string, limit: number, offset: number) {
    return gql<{blocks: MinedBlockRow[]}>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            blocks(where: {author: {id_eq: $id}}, orderBy: height_DESC, limit: $limit, offset: $offset) { id height hash timestamp reward minerFees }
        }`,
        {id: authorHex, limit, offset}
    )
}

export function blocksPage(limit: number, offset: number) {
    return gql<{blocks: BlockRow[]; conn: {totalCount: number}}>(
        `query ($limit: Int!, $offset: Int!) {
            blocks(orderBy: height_DESC, limit: $limit, offset: $offset) { ${BLOCK_FIELDS} }
            conn: blocksConnection(orderBy: height_DESC) { totalCount }
        }`,
        {limit, offset}
    )
}

export interface AccountListRow extends AccountRef {
    balance: string
    nonce: number
    firstSeenBlock: number
    lastActiveBlock: number | null
}

export function accountsPage(limit: number, offset: number) {
    return gql<{accounts: AccountListRow[]; conn: {totalCount: number}; dailyStats: {issuanceTotal: string}[]}>(
        `query ($limit: Int!, $offset: Int!) {
            accounts(orderBy: [balance_DESC, id_ASC], limit: $limit, offset: $offset) { ${ACCOUNT_REF} balance nonce firstSeenBlock lastActiveBlock }
            conn: accountsConnection(orderBy: id_ASC) { totalCount }
            dailyStats(orderBy: date_DESC, limit: 1) { issuanceTotal }
        }`,
        {limit, offset}
    )
}

export interface ExtrinsicRow {
    id: string
    indexInBlock: number
    hash: string
    pallet: string
    method: string
    leafCalls: CallCount[] | null
    // a call row can carry null, an extrinsic never does
    success: boolean | null
    error: unknown
    fee: string | null
    tip: string | null
    minerFee: string
    treasuryFee: string
    signer: AccountRef | null
    block: {height: number; timestamp: string}
    // set when the row stands for one call of the extrinsic, whose name,
    // result and leaves then fill the fields above
    call?: {id: string; within: CallRef | null}
}

export interface CallRow {
    id: string
    address: number[]
    pallet: string
    method: string
    args: unknown
    success: boolean | null
    origin: AccountRef | null
    events: CallRef[]
    block: {specVersion: number}
    subcalls: {id: string}[]
}

export interface EventRow {
    id: string
    indexInBlock: number
    phase: string
    pallet: string
    method: string
    args: unknown
    call: {id: string} & CallRef | null
    extrinsic: {id: string} | null
    block: {height: number; timestamp: string; specVersion: number}
}

const EXTRINSIC_FIELDS = `id indexInBlock hash pallet method leafCalls success error fee tip minerFee treasuryFee signer { ${ACCOUNT_REF} } block { height timestamp }`
const EVENT_FIELDS = `id indexInBlock phase pallet method args call { id pallet method } extrinsic { id } block { height timestamp specVersion }`

// newest first by chain position. event indices run across the whole
// block, so they already follow the extrinsic order
const TIMELINE_ORDER = '[block_height_DESC, indexInBlock_DESC]'

export interface Slice {
    limit: number
    offset: number
}

// the block row carries extrinsicCount and eventCount, so the totals the pagers
// need come free and no connection query is required
export async function blockDetail(idOrHash: string, page: Slice) {
    const byHeight = /^\d+$/.test(idOrHash)
    const where = byHeight ? '{height_eq: $height}' : '{OR: [{hash_eq: $hash}, {evmHash_eq: $hash}]}'
    const data = await gql<{
        blocks: BlockRow[]
        extrinsics: ExtrinsicRow[]
        events: EventRow[]
        minedObjects: {protocol: string; vertexCount: number; vertices: string}[]
    }>(
        `query (${byHeight ? '$height: Int!' : '$hash: String!'}, $limit: Int!, $offset: Int!) {
            blocks(where: ${where}, limit: 1) { ${BLOCK_FIELDS} logs }
            extrinsics(where: {block: ${where}}, orderBy: indexInBlock_ASC, limit: $limit, offset: $offset) { ${EXTRINSIC_FIELDS} }
            events(where: {block: ${where}}, orderBy: indexInBlock_ASC, limit: $limit, offset: $offset) { ${EVENT_FIELDS} }
            minedObjects(where: {block: ${where}}, limit: 1) { protocol vertexCount vertices }
        }`,
        {...(byHeight ? {height: Number(idOrHash)} : {hash: idOrHash.toLowerCase()}), limit: page.limit, offset: page.offset}
    )
    return {...data, minedObjects: await withTopology(data.minedObjects)}
}

export interface PreimageHit {
    texts: {hash: string; title: string | null; description: string | null; referendum: {index: number}}[]
    proposals: {index: number; title: string | null; proposalHash: string; proposalPallet: string | null; proposalMethod: string | null; proposalCalls: ProposalNode[] | null; submittedAt: number}[]
}

/** The referendum texts and proposals a set of hashes name, as far as the index has seen them noted. */
export function preimagesByHash(hashes: string[]) {
    return gql<PreimageHit>(
        `query ($h: [String!]) {
            texts: metadataActions(where: {hash_in: $h, method_eq: "MetadataSet"}, orderBy: id_ASC, limit: 500) { hash title description referendum { index } }
            proposals: referendums(where: {proposalHash_in: $h}, orderBy: index_ASC, limit: 500) { index title proposalHash proposalPallet proposalMethod proposalCalls submittedAt }
        }`,
        {h: hashes}
    )
}

/** The runtime a block ran under, which says how to read what it recorded. */
export async function specVersionAt(height: number): Promise<number | null> {
    const {blocks} = await gql<{blocks: {specVersion: number}[]}>(`query ($height: Int!) { blocks(where: {height_eq: $height}, limit: 1) { specVersion } }`, {height})
    return blocks[0]?.specVersion ?? null
}

export type ExtrinsicHit = Pick<ExtrinsicRow, 'id' | 'indexInBlock' | 'hash' | 'pallet' | 'method' | 'success' | 'block'>

// a hash can name more than one extrinsic, the canonical pair never can
export function extrinsicMatches(hash: string, page: Slice) {
    return gql<{extrinsics: ExtrinsicHit[]; conn: {totalCount: number}}>(
        `query ($h: String!, $limit: Int!, $offset: Int!) {
            extrinsics(where: {hash_eq: $h}, orderBy: id_ASC, limit: $limit, offset: $offset) { id indexInBlock hash pallet method success block { height timestamp } }
            conn: extrinsicsConnection(where: {hash_eq: $h}, orderBy: id_ASC) { totalCount }
        }`,
        {h: hash.toLowerCase(), limit: page.limit, offset: page.offset}
    )
}

// squid pads every step of a call's address into its id, so id order is the
// call tree in preorder and a page of it keeps each call at its own depth
export function extrinsicDetail(height: number, index: number, page: Slice) {
    const of = `{extrinsic: {block: {height_eq: $height}, indexInBlock_eq: $index}}`
    return gql<{
        extrinsics: ExtrinsicRow[]
        calls: CallRow[]
        callCount: {totalCount: number}
        events: EventRow[]
        eventCount: {totalCount: number}
        evm: {id: string}[]
    }>(
        `query ($height: Int!, $index: Int!, $limit: Int!, $offset: Int!) {
            extrinsics(where: {block: {height_eq: $height}, indexInBlock_eq: $index}, limit: 1) { ${EXTRINSIC_FIELDS} }
            calls(where: ${of}, orderBy: id_ASC, limit: $limit, offset: $offset) { id address pallet method args success origin { ${ACCOUNT_REF} } events(orderBy: indexInBlock_ASC) { pallet method } block { specVersion } subcalls(limit: 1) { id } }
            callCount: callsConnection(where: ${of}, orderBy: id_ASC) { totalCount }
            events(where: ${of}, orderBy: indexInBlock_ASC, limit: $limit, offset: $offset) { ${EVENT_FIELDS} }
            eventCount: eventsConnection(where: ${of}, orderBy: id_ASC) { totalCount }
            evm: evmTransactions(where: ${of}, limit: 1) { id }
        }`,
        {height, index, limit: page.limit, offset: page.offset}
    )
}

export function eventDetail(height: number, index: number) {
    return gql<{events: EventRow[]}>(
        `query ($height: Int!, $index: Int!) {
            events(where: {block: {height_eq: $height}, indexInBlock_eq: $index}, limit: 1) { ${EVENT_FIELDS} }
        }`,
        {height, index}
    )
}

export interface AccountRow extends AccountRef {
    free: string
    reserved: string
    balance: string
    frozen: string
    nonce: number
    firstSeenBlock: number
    firstSeenTimestamp: string | null
    lastActiveBlock: number | null
    identityJson: unknown
    identitySuper?: AccountRef | null
    evmAddress: string | null
    vestingJson: unknown
    locksJson: {id: string; amount: string; reasons: string}[] | null
    holdsJson: {reason: unknown; amount: string}[] | null
    depositsJson: {id: string; amount: string}[] | null
}

export interface DelegationRow {
    id: string
    conviction: string
    balance: string
    votes: string
    block: number
    track: {id: string; name: string}
    who?: AccountRef
    target?: AccountRef
}

export interface ProxyRow {
    id: string
    proxyType: string
    delay: number
    delegator?: AccountRef
    delegatee?: AccountRef
}

export interface MultisigOpRow {
    id: string
    callHash: string
    approvals: string[]
    threshold: number | null
    signatories: string[] | null
    status: string
    result: unknown
    createdBlock: number
    updatedBlock: number
    multisig: AccountRef
    depositor: AccountRef
}

export interface AccountSummary {
    accountById: AccountRow | null
    validators: ValidatorRow[]
    registrar: {index: number}[]
    retiredRegistrars: {index: number}[]
    prime: {id: string}[]
    minerDays: {day: string; blocks: number}[]
    nMined: {totalCount: number}
    curated: {totalCount: number}
    childCurated: {totalCount: number}
    nTransfers: {totalCount: number}
    nExtrinsics: {totalCount: number}
    nTimeline: {totalCount: number}
    nSubs: {totalCount: number}
    nJudged: {totalCount: number}
    nDelegOut: {totalCount: number}
    nDelegIn: {totalCount: number}
    nProxyOut: {totalCount: number}
    nProxyIn: {totalCount: number}
    nMultisig: {totalCount: number}
    nMultisigSelf: {totalCount: number}
    /** Calls this account opened and nobody has finished, which is what it is holding a deposit for. */
    msigPending: {threshold: number | null; deposit: string | null}[]
    govDeposits: GovDepositRow[]
    bountyDeposits: BountyDepositRow[]
    childBountyDeposits: ChildBountyDepositRow[]
    nVotes: {totalCount: number}
    nVoteHistory: {totalCount: number}
    nDelegHistory: {totalCount: number}
    /** The proxies this account granted, the accounts that can act for it. */
    proxiesOut: ProxyRow[]
    /** The signer set of this account as a multisig, recovered from its latest call that names one. */
    msigSet: {threshold: number | null; signatories: string[] | null}[]
    pureCreated: {args: {who: string}; block: {height: number}}[]
    delegationsIn: {balance: string; conviction: string; track: {id: string}}[]
}

/** Bounties whose proposal or curator deposit this account still has reserved. */
export interface BountyDepositRow {
    index: number
    bond: string | null
    curatorDeposit: string | null
    proposer: {id: string} | null
    curator: {id: string} | null
}

export interface ChildBountyDepositRow {
    parent: {index: number}
    childIndex: number
    curatorDeposit: string | null
}

/** Referenda whose submission or decision deposit this account still has reserved. */
export interface GovDepositRow {
    index: number
    status: string
    submissionDepositor: string | null
    submissionDeposit: string | null
    decisionDepositor: string | null
    decisionDeposit: string | null
}

// everything the header and the tab strip need and nothing else, the rows a tab
// shows are that tab's own business. counts come back as connection tallies
export function accountSummary(idHex: string) {
    const self = `{id_eq: $id}`
    return gql<AccountSummary>(
        `query ($id: String!) {
            accountById(id: $id) { id free reserved balance frozen nonce firstSeenBlock firstSeenTimestamp lastActiveBlock identityDisplay identityJson identitySubName identitySubData username identitySuper { ${ACCOUNT_REF} } evmAddress vestingJson locksJson holdsJson depositsJson }
            validators(where: {account: ${self}}, limit: 1) { ${VALIDATOR_FIELDS} }
            registrar: registrars(where: {account: ${self}}, orderBy: index_ASC, limit: 1) { index }
            retiredRegistrars: registrars(where: {retiredAt_isNull: false}) { index }
            prime: primeStates(where: {account: ${self}}, limit: 1) { id }
            minerDays: minerDayStats(where: {account: ${self}}, orderBy: day_DESC, limit: 60) { day blocks }
            nMined: blocksConnection(orderBy: id_ASC, where: {author: ${self}}) { totalCount }
            curated: bountiesConnection(orderBy: index_ASC, where: {curator: ${self}}) { totalCount }
            childCurated: childBountiesConnection(orderBy: id_ASC, where: {curator: ${self}}) { totalCount }
            nTransfers: transfersConnection(orderBy: id_ASC, where: {OR: [{from: ${self}}, {to: ${self}}]}) { totalCount }
            nExtrinsics: extrinsicsConnection(orderBy: id_ASC, where: {signer: ${self}}) { totalCount }
            nTimeline: eventsConnection(orderBy: id_ASC, where: ${identityWhere(idHex)}) { totalCount }
            nSubs: accountsConnection(orderBy: id_ASC, where: {identitySuper: ${self}}) { totalCount }
            nJudged: judgementsConnection(orderBy: id_ASC, where: {registrar: {account: ${self}}}) { totalCount }
            nDelegOut: delegationsConnection(orderBy: id_ASC, where: {who: ${self}}) { totalCount }
            nDelegIn: delegationsConnection(orderBy: id_ASC, where: {target: ${self}}) { totalCount }
            nProxyOut: proxyRelationsConnection(orderBy: id_ASC, where: {delegator: ${self}}) { totalCount }
            nProxyIn: proxyRelationsConnection(orderBy: id_ASC, where: {delegatee: ${self}}) { totalCount }
            nMultisig: multisigOpsConnection(orderBy: id_ASC, where: {OR: [{multisig: ${self}}, {depositor: ${self}}]}) { totalCount }
            nMultisigSelf: multisigOpsConnection(orderBy: id_ASC, where: {multisig: ${self}}) { totalCount }
            msigPending: multisigOps(where: {depositor: ${self}, status_in: ["NewMultisig", "MultisigApproval"]}, orderBy: id_ASC) { threshold deposit }
            govDeposits: referendums(where: {OR: [{submissionDepositor_eq: $id}, {decisionDepositor_eq: $id}]}, orderBy: index_ASC) {
                index status submissionDepositor submissionDeposit decisionDepositor decisionDeposit
            }
            bountyDeposits: bounties(where: {OR: [{proposer: ${self}}, {curator: ${self}}]}, orderBy: index_ASC) {
                index bond curatorDeposit proposer { id } curator { id }
            }
            childBountyDeposits: childBounties(where: {curator: ${self}}, orderBy: [parent_index_ASC, childIndex_ASC, id_ASC]) {
                parent { index } childIndex curatorDeposit
            }
            nVotes: votesConnection(orderBy: id_ASC, where: {voter: ${self}}) { totalCount }
            nVoteHistory: votingActionsConnection(orderBy: id_ASC, where: ${OWN_VOTE_ACTIONS}) { totalCount }
            nDelegHistory: delegationActionsConnection(orderBy: id_ASC, where: ${delegationSide('')}) { totalCount }
            proxiesOut: proxyRelations(where: {delegator: ${self}}, orderBy: [delegatee_id_ASC, proxyType_ASC, delay_ASC], limit: 100) { id proxyType delay delegatee { ${ACCOUNT_REF} } }
            msigSet: multisigOps(where: {multisig: ${self}, signatories_isNull: false}, orderBy: [updatedBlock_DESC, id_DESC], limit: 1) { threshold signatories }
            pureCreated: events(where: {pallet_eq: "Proxy", method_eq: "PureCreated", args_jsonContains: {pure: "${idHex}"}}, orderBy: id_ASC, limit: 1) { args block { height } }
            delegationsIn: delegations(where: {target: ${self}}, orderBy: id_ASC) { balance conviction track { id } }
        }`,
        {id: idHex}
    )
}

export async function blockTime(height: number) {
    const {blocks} = await gql<{blocks: {timestamp: string | null}[]}>(`query ($height: Int!) { blocks(where: {height_eq: $height}, limit: 1) { timestamp } }`, {height})
    return blocks[0]?.timestamp ?? null
}

export async function evmCounts(address: string) {
    const {transfers, holdings, contracts, tokens} = await gql<Record<'transfers' | 'holdings' | 'contracts' | 'tokens', {totalCount: number}>>(
        `query ($a: String!) {
            transfers: tokenTransfersConnection(orderBy: id_ASC, where: {OR: [{from_eq: $a}, {to_eq: $a}]}) { totalCount }
            holdings: tokenHoldersConnection(orderBy: id_ASC, where: {address_eq: $a, ${HELD}}) { totalCount }
            contracts: evmTransactionsConnection(orderBy: id_ASC, where: {from_eq: $a, contractAddress_isNull: false, status_eq: "Succeed"}) { totalCount }
            tokens: tokensConnection(orderBy: id_ASC, where: {deployTx: {from_eq: $a}}) { totalCount }
        }`,
        {a: address}
    )
    return {transfers: transfers.totalCount, holdings: holdings.totalCount, contracts: contracts.totalCount, tokens: tokens.totalCount}
}

export interface AccountVoteRow extends VoteRow {
    referendum: {index: number; title: string | null; status: string; decidingSince: number | null; confirmingSince: number | null; endedAt: number | null}
}

// the account's votes on one page, the vote count under each list a vote can
// be filed in, and the delegated votes each referendum on the page counts
// through the account's standard vote there
export async function votesFor(idHex: string, list: VoteList | '', limit: number, offset: number) {
    const own = 'voter: {id_eq: $id}'
    const where = list ? `{${own}, ${VOTE_LISTS[list].where}}` : `{${own}}`
    const counts = VOTE_LIST_KEYS.map(l => `${l}: votesConnection(where: {${own}, ${VOTE_LISTS[l].where}}, orderBy: id_ASC) { totalCount }`)
    const raw = await gql<{votes: AccountVoteRow[]; conn: {totalCount: number}; all: {totalCount: number}} & Record<VoteList, {totalCount: number}>>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            votes(where: ${where}, orderBy: [block_DESC, referendum_index_DESC, id_DESC], limit: $limit, offset: $offset) { ${VOTE_FIELDS} referendum { index title status decidingSince confirmingSince endedAt } }
            conn: votesConnection(where: ${where}, orderBy: id_ASC) { totalCount }
            all: votesConnection(where: {${own}}, orderBy: id_ASC) { totalCount }
            ${counts.join('\n            ')}
        }`,
        {id: idHex, limit, offset}
    )
    return {
        votes: raw.votes,
        total: raw.conn.totalCount,
        all: raw.all.totalCount,
        counts: Object.fromEntries(VOTE_LIST_KEYS.map(l => [l, raw[l].totalCount])) as Record<VoteList, number>,
        delegated: await delegatedVotesOn(idHex, raw.votes.map(v => v.referendum.index)),
    }
}

async function delegatedVotesOn(idHex: string, indexes: number[]): Promise<Map<number, bigint>> {
    const totals = new Map<number, bigint>()
    if (indexes.length === 0) return totals
    const rows = await sweep(page =>
        gql<{delegatedVotes: {conviction: string; balance: string; referendum: {index: number}}[]}>(
            `query ($id: String!, $indexes: [Int!], $limit: Int!, $offset: Int!) {
                delegatedVotes(where: {voter: {id_eq: $id}, referendum: {index_in: $indexes}, removed_eq: false}, orderBy: id_ASC, limit: $limit, offset: $offset) { conviction balance referendum { index } }
            }`,
            {id: idHex, indexes, ...page}
        ).then(r => r.delegatedVotes)
    )
    for (const d of rows) totals.set(d.referendum.index, (totals.get(d.referendum.index) ?? 0n) + weigh(d.balance, d.conviction))
    return totals
}

// open counts the referenda still taking votes once the account showed up
export function votesSummary(idHex: string, firstSeenBlock: number) {
    return gql<Record<'all' | 'active' | 'open', {totalCount: number}>>(
        `query ($id: String!, $from: Int!) {
            all: votesConnection(where: {voter: {id_eq: $id}, removed_eq: false}, orderBy: id_ASC) { totalCount }
            active: votesConnection(where: {voter: {id_eq: $id}, removed_eq: false, referendum: {status_eq: Ongoing}}, orderBy: id_ASC) { totalCount }
            open: referendumsConnection(where: {OR: [{endedAt_isNull: true}, {endedAt_gte: $from}]}, orderBy: index_ASC) { totalCount }
        }`,
        {id: idHex, from: firstSeenBlock}
    )
}

export interface VoteHistoryRow extends VoteShape {
    id: string
    method: string
    delegatedVotes: string
    block: number
    timestamp: string
    referendum: {index: number}
}

export interface DelegationActionRow {
    id: string
    method: string
    conviction: string | null
    balance: string | null
    block: number
    timestamp: string
    track: {id: string; name: string}
    who: AccountRef
    target: AccountRef
}

// the account's own votes and removals, a delegation row names it only as the
// target whose vote the delegation moved
const OWN_VOTE_ACTIONS = `{voter: {id_eq: $id}, delegator_isNull: true}`

const delegationSide = (dir: 'in' | 'out' | '') =>
    dir === 'out' ? '{who: {id_eq: $id}}' : dir === 'in' ? '{target: {id_eq: $id}}' : '{OR: [{who: {id_eq: $id}}, {target: {id_eq: $id}}]}'

export function voteHistoryFor(idHex: string, limit: number, offset: number) {
    return gql<{actions: VoteHistoryRow[]; conn: {totalCount: number}}>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            actions: votingActions(where: ${OWN_VOTE_ACTIONS}, orderBy: [block_DESC, indexInBlock_DESC], limit: $limit, offset: $offset) { id method kind aye conviction balance ayeAmount nayAmount abstainAmount delegatedVotes block timestamp referendum { index } }
            conn: votingActionsConnection(where: ${OWN_VOTE_ACTIONS}, orderBy: id_ASC) { totalCount }
        }`,
        {id: idHex, limit, offset}
    )
}

export function delegationHistoryFor(idHex: string, dir: 'in' | 'out' | '', limit: number, offset: number) {
    const side = delegationSide(dir)
    return gql<{actions: DelegationActionRow[]; conn: {totalCount: number}}>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            actions: delegationActions(where: ${side}, orderBy: [block_DESC, indexInBlock_DESC], limit: $limit, offset: $offset) { id method conviction balance block timestamp track { id name } who { ${ACCOUNT_REF} } target { ${ACCOUNT_REF} } }
            conn: delegationActionsConnection(where: ${side}, orderBy: id_ASC) { totalCount }
        }`,
        {id: idHex, limit, offset}
    )
}

export function delegationsOutFor(idHex: string) {
    return gql<{delegations: DelegationRow[]}>(
        `query ($id: String!) {
            delegations(where: {who: {id_eq: $id}}, orderBy: [track_index_ASC, id_ASC], limit: 100) { id conviction balance votes block track { id name } target { ${ACCOUNT_REF} } }
        }`,
        {id: idHex}
    )
}

export function proxiesFor(idHex: string, limit: number, offset: number) {
    return gql<{out: ProxyRow[]; in: ProxyRow[]; inCount: {totalCount: number}}>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            out: proxyRelations(where: {delegator: {id_eq: $id}}, orderBy: [delegatee_id_ASC, proxyType_ASC, delay_ASC], limit: 100) { id proxyType delay delegatee { ${ACCOUNT_REF} } }
            in: proxyRelations(where: {delegatee: {id_eq: $id}}, orderBy: [delegator_id_ASC, proxyType_ASC, delay_ASC], limit: $limit, offset: $offset) { id proxyType delay delegator { ${ACCOUNT_REF} } }
            inCount: proxyRelationsConnection(where: {delegatee: {id_eq: $id}}, orderBy: id_ASC) { totalCount }
        }`,
        {id: idHex, limit, offset}
    )
}

export function multisigOpsFor(idHex: string, limit: number, offset: number) {
    const mine = '{OR: [{multisig: {id_eq: $id}}, {depositor: {id_eq: $id}}]}'
    return gql<{multisigOps: MultisigOpRow[]; conn: {totalCount: number}; signed: {threshold: number | null; signatories: string[] | null}[]}>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            multisigOps(where: ${mine}, orderBy: [updatedBlock_DESC, id_DESC], limit: $limit, offset: $offset) {
                id callHash approvals threshold signatories status result createdBlock updatedBlock
                multisig { ${ACCOUNT_REF} } depositor { ${ACCOUNT_REF} }
            }
            conn: multisigOpsConnection(where: ${mine}, orderBy: id_ASC) { totalCount }
            signed: multisigOps(where: {multisig: {id_eq: $id}, signatories_isNull: false}, orderBy: [updatedBlock_DESC, id_DESC], limit: 1) { threshold signatories }
        }`,
        {id: idHex, limit, offset}
    )
}

export function transfersPage(limit: number, offset: number) {
    return gql<{transfers: TransferRow[]; conn: {totalCount: number}}>(
        `query ($limit: Int!, $offset: Int!) {
            transfers(orderBy: ${TRANSFER_ORDER}, limit: $limit, offset: $offset) { ${TRANSFER_FIELDS} }
            conn: transfersConnection(orderBy: timestamp_DESC) { totalCount }
        }`,
        {limit, offset}
    )
}

export interface IdentityRow extends AccountRef {
    identityJson: unknown
    subs: AccountRef[]
    delegators: number
    delegated: string
}

const HAS_IDENTITY = '{identityJson_isNull: false}'
const IDENTITY_ORDER = '[identityRank_ASC, delegate_delegated_DESC_NULLS_LAST, identitySetBlock_ASC, id_ASC]'
const SUB_ORDER = '[identitySubName_ASC_NULLS_LAST, id_ASC]'

// a registration lists its judgements as [registrar, verdict] pairs, so a
// verdict kind is found by containment
const judged = (kinds: string[]) => `{OR: [${kinds.map(k => `{identityJson_jsonContains: {judgements: [[{__kind: "${k}"}]]}}`).join(', ')}]}`

export async function peopleCounts() {
    const tally = (where: string) => `accountsConnection(orderBy: id_ASC, where: ${where}) { totalCount }`
    const names = (status?: string) => `usernamesConnection(orderBy: id_ASC${status ? `, where: {status_eq: "${status}"}` : ''}) { totalCount }`
    const good = judged(GOOD_JUDGEMENTS)
    const bad = judged(BAD_JUDGEMENTS)
    const r = await gql<
        Record<'direct' | 'good' | 'goodAndBad' | 'bad' | 'subs' | 'usernames' | 'pending' | 'unbinding' | 'registrars' | 'retired', {totalCount: number}> & {
            authorities: {allocation: number}[]
            latest: {lastJudgementBlock: number | null}[]
        }
    >(
        `query {
            direct: ${tally(HAS_IDENTITY)}
            good: ${tally(good)}
            goodAndBad: ${tally(`{AND: [${good}, ${bad}]}`)}
            bad: ${tally(bad)}
            subs: ${tally('{identitySuper_isNull: false}')}
            usernames: ${names()}
            pending: ${names('Pending')}
            unbinding: ${names('Unbinding')}
            authorities: usernameAuthorities(orderBy: id_ASC) { allocation }
            registrars: registrarsConnection(orderBy: index_ASC) { totalCount }
            retired: registrarsConnection(orderBy: index_ASC, where: {retiredAt_isNull: false}) { totalCount }
            latest: registrars(orderBy: [lastJudgementBlock_DESC_NULLS_LAST, index_ASC], limit: 1) { lastJudgementBlock }
        }`
    )
    return {
        direct: r.direct.totalCount,
        // a bad verdict outweighs a good one
        verified: r.good.totalCount - r.goodAndBad.totalCount,
        flagged: r.bad.totalCount,
        subs: r.subs.totalCount,
        usernames: r.usernames.totalCount,
        pending: r.pending.totalCount,
        unbinding: r.unbinding.totalCount,
        authorities: r.authorities.length,
        allocationLeft: r.authorities.reduce((n, a) => n + a.allocation, 0),
        registrars: r.registrars.totalCount,
        retired: r.retired.totalCount,
        latestJudgement: r.latest[0]?.lastJudgementBlock ?? null,
    }
}

export async function identitiesPage(limit: number, offset: number): Promise<{accounts: IdentityRow[]}> {
    const {accounts} = await gql<{accounts: (Omit<IdentityRow, 'delegators' | 'delegated'> & {delegate: {delegators: number; delegated: string} | null})[]}>(
        `query ($limit: Int!, $offset: Int!) {
            accounts(where: ${HAS_IDENTITY}, orderBy: ${IDENTITY_ORDER}, limit: $limit, offset: $offset) {
                ${ACCOUNT_REF} subs(orderBy: ${SUB_ORDER}) { ${ACCOUNT_REF} } delegate { delegators delegated }
            }
        }`,
        {limit, offset}
    )
    return {accounts: accounts.map(({delegate, ...a}) => ({...a, delegators: delegate?.delegators ?? 0, delegated: delegate?.delegated ?? '0'}))}
}

export interface DelegateRow {
    id: string
    account: AccountRef
    delegators: number
    tracks: number
    delegated: string
    voted: number
}

// account ids are hex, safe to splice into aliases
export async function delegatesPage(limit: number, offset: number): Promise<DelegateRow[]> {
    const {delegates} = await gql<{delegates: Omit<DelegateRow, 'voted'>[]}>(
        `query ($limit: Int!, $offset: Int!) {
            delegates(orderBy: [delegated_DESC, delegators_DESC, id_ASC], limit: $limit, offset: $offset) { id delegators tracks delegated account { ${ACCOUNT_REF} } }
        }`,
        {limit, offset}
    )
    if (delegates.length === 0) return []
    const voted = await gql<Record<string, {totalCount: number}>>(
        `query {
            ${delegates.map((d, i) => `v${i}: votesConnection(where: {voter: {id_eq: "${d.id}"}, removed_eq: false}, orderBy: id_ASC) { totalCount }`).join('\n            ')}
        }`
    )
    return delegates.map((d, i) => ({...d, voted: voted[`v${i}`].totalCount}))
}

export interface RegistrarRow {
    id: string
    index: number
    fee: string | null
    addedAt: number | null
    retiredAt: number | null
    requestCount: number
    givenCount: number
    lastJudgementBlock: number | null
    lastJudgementAt: string | null
    account: AccountRef | null
}

const REGISTRAR_FIELDS = `id index fee addedAt retiredAt requestCount givenCount lastJudgementBlock lastJudgementAt account { ${ACCOUNT_REF} }`

export function registrarsPage(limit: number, offset: number) {
    return gql<{registrars: RegistrarRow[]}>(
        `query ($limit: Int!, $offset: Int!) {
            registrars(orderBy: index_ASC, limit: $limit, offset: $offset) { ${REGISTRAR_FIELDS} }
        }`,
        {limit, offset}
    )
}

export function registrarsByIndex(indexes: number[]) {
    return gql<{registrars: RegistrarRow[]}>(`query ($indexes: [Int!]) { registrars(where: {index_in: $indexes}) { ${REGISTRAR_FIELDS} } }`, {indexes})
}

export interface UsernameRow {
    id: string
    owner: AccountRef
    status: string
    expiresAt: number | null
    provider: string
    deposit: string | null
    primary: boolean
    grantedBlock: number
    grantedAt: string
}

// the owner leaves its username out, the row already names it
export function usernamesPage(limit: number, offset: number) {
    return gql<{usernames: UsernameRow[]}>(
        `query ($limit: Int!, $offset: Int!) {
            usernames(orderBy: [grantedBlock_DESC, id_ASC], limit: $limit, offset: $offset) {
                id status expiresAt provider deposit primary grantedBlock grantedAt owner { ${IDENTITY_REF} }
            }
        }`,
        {limit, offset}
    )
}

export interface UsernameAuthorityRow {
    id: string
    account: AccountRef
    allocation: number
    usernameCount: number
    addedBlock: number | null
    addedAt: string | null
}

export function usernameAuthoritiesPage(limit: number, offset: number) {
    return gql<{usernameAuthorities: UsernameAuthorityRow[]}>(
        `query ($limit: Int!, $offset: Int!) {
            usernameAuthorities(orderBy: [addedBlock_ASC_NULLS_FIRST, id_ASC], limit: $limit, offset: $offset) {
                id allocation usernameCount addedBlock addedAt account { ${ACCOUNT_REF} }
            }
        }`,
        {limit, offset}
    )
}

export function transfersFor(idHex: string, dir: 'in' | 'out' | '', limit: number, offset: number) {
    const side = dir === 'out' ? '{from: {id_eq: $id}}' : dir === 'in' ? '{to: {id_eq: $id}}' : '{OR: [{from: {id_eq: $id}}, {to: {id_eq: $id}}]}'
    return gql<{transfers: TransferRow[]; conn: {totalCount: number}}>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            transfers(where: ${side}, orderBy: ${TRANSFER_ORDER}, limit: $limit, offset: $offset) { ${TRANSFER_FIELDS} }
            conn: transfersConnection(where: ${side}, orderBy: id_ASC) { totalCount }
        }`,
        {id: idHex, limit, offset}
    )
}

export function tokenTransfersFor(address: string, limit: number, offset: number) {
    return gql<{tokenTransfers: TokenTransferRow[]; conn: {totalCount: number}}>(
        `query ($a: String!, $limit: Int!, $offset: Int!) {
            tokenTransfers(where: {OR: [{from_eq: $a}, {to_eq: $a}]}, orderBy: ${TOKEN_TRANSFER_ORDER}, limit: $limit, offset: $offset) { ${TOKEN_TRANSFER_FIELDS} }
            conn: tokenTransfersConnection(where: {OR: [{from_eq: $a}, {to_eq: $a}]}, orderBy: id_ASC) { totalCount }
        }`,
        {a: address, limit, offset}
    )
}

export function tokenHoldingsFor(address: string, limit: number, offset: number) {
    return gql<{holdings: HoldingRow[]; conn: {totalCount: number}}>(
        `query ($a: String!, $limit: Int!, $offset: Int!) {
            holdings: tokenHolders(where: {address_eq: $a, ${HELD}}, orderBy: ${HOLDING_ORDER}, limit: $limit, offset: $offset) { balance token { ${TOKEN_FIELDS} } }
            conn: tokenHoldersConnection(where: {address_eq: $a, ${HELD}}, orderBy: id_ASC) { totalCount }
        }`,
        {a: address, limit, offset}
    )
}

export interface CallKindRow {
    id: string
    pallet: string
    method: string
}

export function callKinds() {
    return gql<{callKinds: CallKindRow[]}>(`query { callKinds(orderBy: id_ASC, limit: 1000) { id pallet method } }`)
}

export interface ExtrinsicFilter {
    pallet?: string
    method?: string
    signer?: string
    result?: 'success' | 'failed' | 'unapplied'
    after?: string
    before?: string
}

// every value here is checked against the call list or a shape before it lands
// in the query, so the clause can be built by hand. a call reaches its signer
// through the extrinsic
function filterParts(f: ExtrinsicFilter, on: 'extrinsic' | 'call', skipCall = false): string[] {
    const parts: string[] = []
    if (f.pallet && !skipCall) parts.push(`pallet_eq: "${f.pallet}"`)
    if (f.method && !skipCall) parts.push(`method_eq: "${f.method}"`)
    if (f.signer) parts.push(on === 'call' ? `extrinsic: {signer: {id_eq: "${f.signer}"}}` : `signer: {id_eq: "${f.signer}"}`)
    if (f.result === 'unapplied') parts.push('success_isNull: true')
    else if (f.result) parts.push(`success_eq: ${f.result === 'success'}`)
    const span: string[] = []
    if (f.after) span.push(`timestamp_gte: "${f.after}T00:00:00.000Z"`)
    if (f.before) span.push(`timestamp_lte: "${f.before}T23:59:59.999Z"`)
    if (span.length) parts.push(`block: {${span.join(', ')}}`)
    return parts
}

const clause = (parts: string[]) => (parts.length ? `where: {${parts.join(', ')}}, ` : '')

interface CallHit {
    id: string
    address: number[]
    pallet: string
    method: string
    success: boolean | null
    extrinsic: ExtrinsicRow
}

// a call under the root stands on its own row, naming the root it sits in
const callRow = ({id, address, pallet, method, success, extrinsic: x}: CallHit): ExtrinsicRow => ({
    ...x,
    pallet,
    method,
    success,
    leafCalls: address.length === 0 ? x.leafCalls : null,
    call: {id, within: address.length === 0 ? null : {pallet: x.pallet, method: x.method}},
})

// a pallet or method filter lists the calls it matches at any depth, a batch
// spread over one row per call, and so does asking for calls that never took
// effect, which only sit under a root; otherwise the list stays one row per extrinsic
export async function extrinsicsPage(limit: number, offset: number, f: ExtrinsicFilter, pallets: string[]) {
    const byCall = !!(f.pallet || f.method || f.result === 'unapplied')
    const w = clause(filterParts(f, byCall ? 'call' : 'extrinsic'))
    // each pallet option counts the calls it would show, with the other filters still on
    const others = filterParts(f, 'call', true)
    const tallies = pallets.map(
        (p, i) => `p${i}: callsConnection(${clause([...others, `pallet_eq: "${p}"`])}orderBy: id_ASC) { totalCount }`
    )
    const rows = byCall
        ? `rows: calls(${w}orderBy: [block_height_DESC, extrinsic_indexInBlock_DESC, id_ASC], limit: $limit, offset: $offset) { id address pallet method success extrinsic { ${EXTRINSIC_FIELDS} } }
            conn: callsConnection(${w}orderBy: id_ASC) { totalCount }`
        : `rows: extrinsics(${w}orderBy: ${TIMELINE_ORDER}, limit: $limit, offset: $offset) { ${EXTRINSIC_FIELDS} }
            conn: extrinsicsConnection(${w}orderBy: id_ASC) { totalCount }`
    const raw = await gql<Record<string, never>>(
        `query ($limit: Int!, $offset: Int!) {
            ${rows}
            ${tallies.join('\n            ')}
        }`,
        {limit, offset}
    )
    const box = raw as unknown as Record<string, {totalCount: number}> & {rows: (ExtrinsicRow | CallHit)[]}
    return {
        rows: byCall ? (box.rows as CallHit[]).map(callRow) : (box.rows as ExtrinsicRow[]),
        total: box.conn.totalCount,
        counts: Object.fromEntries(pallets.map((p, i) => [p, box[`p${i}`]?.totalCount ?? 0])),
    }
}

export function eventKinds() {
    return gql<{eventKinds: CallKindRow[]}>(`query { eventKinds(orderBy: id_ASC, limit: 1000) { id pallet method } }`)
}

export interface EventFilter {
    pallet?: string
    method?: string
    phase?: string
    after?: string
    before?: string
}

// every value here is checked against the event list or a shape before it lands in the query
function eventParts(f: EventFilter, skipKind = false): string[] {
    const parts: string[] = []
    if (f.pallet && !skipKind) parts.push(`pallet_eq: "${f.pallet}"`)
    if (f.method && !skipKind) parts.push(`method_eq: "${f.method}"`)
    if (f.phase) parts.push(`phase_eq: "${f.phase}"`)
    const span: string[] = []
    if (f.after) span.push(`timestamp_gte: "${f.after}T00:00:00.000Z"`)
    if (f.before) span.push(`timestamp_lte: "${f.before}T23:59:59.999Z"`)
    if (span.length) parts.push(`block: {${span.join(', ')}}`)
    return parts
}

export async function eventsPage(limit: number, offset: number, f: EventFilter, pallets: string[]) {
    const w = clause(eventParts(f))
    // each pallet option counts what it would show, with the other filters still on
    const others = eventParts(f, true)
    const tallies = pallets.map((p, i) => `p${i}: eventsConnection(${clause([...others, `pallet_eq: "${p}"`])}orderBy: id_ASC) { totalCount }`)
    const raw = await gql<Record<string, never>>(
        `query ($limit: Int!, $offset: Int!) {
            rows: events(${w}orderBy: ${TIMELINE_ORDER}, limit: $limit, offset: $offset) { ${EVENT_FIELDS} }
            conn: eventsConnection(${w}orderBy: id_ASC) { totalCount }
            ${tallies.join('\n            ')}
        }`,
        {limit, offset}
    )
    const box = raw as unknown as Record<string, {totalCount: number}> & {rows: EventRow[]}
    return {
        rows: box.rows,
        total: box.conn.totalCount,
        counts: Object.fromEntries(pallets.map((p, i) => [p, box[`p${i}`]?.totalCount ?? 0])),
    }
}

export interface IdentityEventRow {
    id: string
    indexInBlock: number
    method: string
    args: unknown
    block: {height: number; timestamp: string}
    call: {method: string; args: unknown} | null
    extrinsic: {id: string} | null
}

// pallet identity names its subject under four different keys
const identityWhere = (idHex: string) =>
    `{OR: [${['who', 'target', 'sub', 'main']
        .map(k => `{pallet_eq: "Identity", args_jsonContains: {${k}: "${idHex}"}}`)
        .join(', ')}]}`

export function identityTimeline(idHex: string, limit: number, offset: number) {
    const where = identityWhere(idHex)
    return gql<{events: IdentityEventRow[]; conn: {totalCount: number}}>(
        `query ($limit: Int!, $offset: Int!) {
            events(where: ${where}, orderBy: ${TIMELINE_ORDER}, limit: $limit, offset: $offset) { id indexInBlock method args block { height timestamp } call { method args } extrinsic { id } }
            conn: eventsConnection(orderBy: ${TIMELINE_ORDER}, where: ${where}) { totalCount }
        }`,
        {limit, offset}
    )
}

export function subIdentitiesPage(idHex: string, limit: number, offset: number) {
    return gql<{accounts: {id: string; identitySubName: string | null; identitySubData: unknown}[]; conn: {totalCount: number}}>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            accounts(where: {identitySuper: {id_eq: $id}}, orderBy: ${SUB_ORDER}, limit: $limit, offset: $offset) { id identitySubName identitySubData }
            conn: accountsConnection(orderBy: id_ASC, where: {identitySuper: {id_eq: $id}}) { totalCount }
        }`,
        {id: idHex, limit, offset}
    )
}

export function judgementsByEvent(ids: string[]) {
    return gql<{judgements: {id: string; kind: string | null; fee: string | null}[]}>(
        `query ($ids: [String!]!) { judgements(where: {id_in: $ids}, limit: 100) { id kind fee } }`,
        {ids}
    )
}

export interface JudgementRow {
    id: string
    kind: string | null
    fee: string | null
    block: number
    timestamp: string
    target: AccountRef
}

export function judgementsGiven(index: number, limit: number, offset: number) {
    return gql<{judgements: JudgementRow[]; conn: {totalCount: number}}>(
        `query ($index: Int!, $limit: Int!, $offset: Int!) {
            judgements(where: {registrar: {index_eq: $index}}, orderBy: [block_DESC, id_DESC], limit: $limit, offset: $offset) {
                id kind fee block timestamp target { ${ACCOUNT_REF} }
            }
            conn: judgementsConnection(orderBy: block_DESC, where: {registrar: {index_eq: $index}}) { totalCount }
        }`,
        {index, limit, offset}
    )
}

// a Uniswap V2 style pair's two pooled tokens, all four absent for any other token
export interface TokenPair {
    token0: string | null
    token1: string | null
    token0Symbol: string | null
    token1Symbol: string | null
}

export interface TokenRow extends TokenPair {
    id: string
    name: string | null
    symbol: string | null
    decimals: number | null
    totalSupply: string | null
    holderCount: number
    transferCount: number
    deployTx: {id: string; from: string; block: {height: number}} | null
    firstBlock: number
    proxyType: string | null
    implementations: string[] | null
}

export interface HoldingRow {
    balance: string
    token: TokenRow
}

const PAIR_FIELDS = 'token0 token1 token0Symbol token1Symbol'
const TOKEN_FIELDS = `id name symbol decimals totalSupply holderCount transferCount deployTx { id from block { height } } firstBlock proxyType implementations ${PAIR_FIELDS}`
const TOKEN_ORDER = '[transferCount_DESC, id_ASC]'
// holders are the addresses whose last balanceOf answer was above zero, as Token.holderCount counts them
const HELD = 'balance_gt: 0'
const HOLDER_ORDER = '[balance_DESC_NULLS_LAST, id_ASC]'
// balances of different tokens don't compare, so an address's holdings go by token name
const HOLDING_ORDER = '[token_name_ASC_NULLS_LAST, id_ASC]'

// a pair answers token0 and token1 together or neither, so token0 alone tells the two apart
export function tokensPage(lp: boolean, limit: number, offset: number) {
    return gql<{tokens: TokenRow[]; plain: {totalCount: number}; pairs: {totalCount: number}}>(
        `query ($plain: Boolean!, $limit: Int!, $offset: Int!) {
            tokens(where: {token0_isNull: $plain}, orderBy: ${TOKEN_ORDER}, limit: $limit, offset: $offset) { ${TOKEN_FIELDS} }
            plain: tokensConnection(where: {token0_isNull: true}, orderBy: id_ASC) { totalCount }
            pairs: tokensConnection(where: {token0_isNull: false}, orderBy: id_ASC) { totalCount }
        }`,
        {plain: !lp, limit, offset}
    )
}

export interface TokenTransferRow {
    id: string
    from: string
    to: string
    amount: string
    timestamp: string
    token: {id: string; symbol: string | null; decimals: number | null}
    transaction: {id: string}
    block: {height: number}
}

const TOKEN_TRANSFER_FIELDS = `id from to amount timestamp token { id symbol decimals } transaction { id } block { height }`
// logIndex counts across the whole block, so it orders a block's txs too
const TOKEN_TRANSFER_ORDER = '[timestamp_DESC, logIndex_DESC, id_DESC]'
const LOG_ORDER = '[logIndex_ASC, id_ASC]'

export function tokenDetail(address: string, page: Slice) {
    return gql<{
        tokenById: TokenRow | null
        tokenHolders: {id: string; address: string; balance: string}[]
        tokenTransfers: TokenTransferRow[]
    }>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            tokenById(id: $id) { ${TOKEN_FIELDS} }
            tokenHolders(where: {token: {id_eq: $id}, ${HELD}}, orderBy: ${HOLDER_ORDER}, limit: $limit, offset: $offset) { id address balance }
            tokenTransfers(where: {token: {id_eq: $id}}, orderBy: ${TOKEN_TRANSFER_ORDER}, limit: $limit, offset: $offset) { ${TOKEN_TRANSFER_FIELDS} }
        }`,
        {id: address, limit: page.limit, offset: page.offset}
    )
}

export interface EvmActivity {
    id: string
    txCount: number
    firstSeenBlock: number
    lastActiveBlock: number | null
}

export function evmActivity(addresses: string[]) {
    return gql<{evmAddresses: EvmActivity[]}>(
        `query ($ids: [String!]) {
            evmAddresses(where: {id_in: $ids}, limit: ${Math.max(1, addresses.length)}) { id txCount firstSeenBlock lastActiveBlock }
        }`,
        {ids: addresses}
    )
}

export interface EvmTxRow {
    id: string
    txIndex: number
    from: string
    to: string | null
    contractAddress: string | null
    value: string
    input: string
    inputSelector: string | null
    nonce: number
    gasLimit: string
    gasUsed: string
    gasPrice: string
    txType: string
    status: string
    exitReason: unknown
    timestamp: string
    block: {height: number}
    extrinsic: {id: string}
}

export interface EvmTxDetailRow extends EvmTxRow {
    extrinsic: {id: string; transfers: TransferRow[]}
}

const EVM_TX_FIELDS = `id txIndex from to contractAddress value input inputSelector nonce gasLimit gasUsed gasPrice txType status exitReason timestamp block { height } extrinsic { id }`

export function evmTxDetail(hash: string, page: Slice) {
    const tx = '{transaction: {id_eq: $id}}'
    return gql<{
        evmTransactionById: EvmTxDetailRow | null
        evmLogs: {id: string; logIndex: number; address: string; topics: string[]; data: string}[]
        logCount: {totalCount: number}
        tokenTransfers: TokenTransferRow[]
        tokenTransferCount: {totalCount: number}
    }>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            evmTransactionById(id: $id) { ${EVM_TX_FIELDS} extrinsic { transfers(orderBy: id_ASC) { ${TRANSFER_FIELDS} } } }
            evmLogs(where: ${tx}, orderBy: ${LOG_ORDER}, limit: $limit, offset: $offset) { id logIndex address topics data }
            logCount: evmLogsConnection(where: ${tx}, orderBy: id_ASC) { totalCount }
            tokenTransfers(where: ${tx}, orderBy: ${LOG_ORDER}, limit: $limit, offset: $offset) { ${TOKEN_TRANSFER_FIELDS} }
            tokenTransferCount: tokenTransfersConnection(where: ${tx}, orderBy: id_ASC) { totalCount }
        }`,
        {id: hash, limit: page.limit, offset: page.offset}
    )
}

export function evmAddressData(address: string, page: Slice) {
    const txs = '{OR: [{from_eq: $a}, {to_eq: $a}, {contractAddress_eq: $a}]}'
    return gql<{
        txs: EvmTxRow[]
        txCount: {totalCount: number}
        holdings: HoldingRow[]
        holdingCount: {totalCount: number}
        created: {id: string}[]
        asToken: TokenRow | null
    }>(
        `query ($a: String!, $limit: Int!, $offset: Int!) {
            txs: evmTransactions(where: ${txs}, orderBy: [timestamp_DESC, txIndex_DESC], limit: $limit, offset: $offset) { ${EVM_TX_FIELDS} }
            txCount: evmTransactionsConnection(where: ${txs}, orderBy: id_ASC) { totalCount }
            holdings: tokenHolders(where: {address_eq: $a, ${HELD}}, orderBy: ${HOLDING_ORDER}, limit: $limit, offset: $offset) { balance token { ${TOKEN_FIELDS} } }
            holdingCount: tokenHoldersConnection(where: {address_eq: $a, ${HELD}}, orderBy: id_ASC) { totalCount }
            created: evmTransactions(where: {contractAddress_eq: $a}, limit: 1) { id }
            asToken: tokenById(id: $a) { ${TOKEN_FIELDS} }
        }`,
        {a: address, limit: page.limit, offset: page.offset}
    )
}

// absent for contracts a factory built, the index only sees create txs
export async function contractCreation(address: string) {
    const {evmTransactions} = await gql<{evmTransactions: {id: string; input: string}[]}>(
        `query ($a: String!) {
            evmTransactions(where: {contractAddress_eq: $a}, limit: 1) { id input }
        }`,
        {a: address}
    )
    return evmTransactions[0] ?? null
}

export interface TrackRow {
    id: string
    name: string
    maxDeciding: number
    maxSpend: string | null
    decisionDeposit: string
    preparePeriod: number
    decisionPeriod: number
    confirmPeriod: number
    minEnactmentPeriod: number
    minApproval: unknown
    minSupport: unknown
}

/**
 * One call out of a proposal, flattened in preorder. The address reads the
 * list back as the tree the chain would run, the way Call rows do.
 */
export interface ProposalNode {
    pallet: string
    method: string
    address: number[]
    args: unknown
    amount?: string
    beneficiary?: string
    validFrom?: number | null
    bounty?: number
}

export interface ReferendumRow {
    id: string
    index: number
    origin: unknown
    proposalHash: string | null
    title: string | null
    description: string | null
    proposalPallet: string | null
    proposalMethod: string | null
    proposalPayouts: number | null
    proposalAmount: string | null
    proposalBeneficiary: string | null
    submittedAt: number
    submittedTimestamp: string
    status: string
    decidingSince: number | null
    confirmingSince: number | null
    endedAt: number | null
    ayes: string
    nays: string
    support: string
    timeline: unknown
    submitter: AccountRef | null
    submissionDepositor: string | null
    submissionDeposit: string | null
    decisionDepositor: string | null
    decisionDeposit: string | null
    track: TrackRow
}

export interface ReferendumDetailRow extends ReferendumRow {
    proposalCalls: ProposalNode[] | null
}

/** A spend an enactment created, tied back to the proposal call it came from. */
export interface ReferendumSpendRow {
    id: string
    kind: string
    status: string
    validFrom: number | null
    expireAt: number | null
    paidAt: number | null
    proposalCall: number | null
}

const TRACK_FIELDS = `id name maxDeciding maxSpend decisionDeposit preparePeriod decisionPeriod confirmPeriod minEnactmentPeriod minApproval minSupport`
const REFERENDUM_FIELDS = `id index origin proposalHash title description proposalPallet proposalMethod proposalPayouts proposalAmount proposalBeneficiary submittedAt submittedTimestamp status decidingSince confirmingSince endedAt ayes nays support timeline submitter { ${ACCOUNT_REF} } submissionDepositor submissionDeposit decisionDepositor decisionDeposit track { ${TRACK_FIELDS} }`

export interface TreasurySpendRow {
    id: string
    referendum: {index: number; status: string} | null
    kind: string
    amount: string
    status: string
    block: number
    beneficiary: AccountRef
}

export interface BountyRow {
    id: string
    index: number
    referendum?: {index: number; status: string} | null
    value: string
    fee: string | null
    description: string | null
    status: string
    unlockAt: number | null
    updateDue: number | null
    payout: string | null
    createdAt: number
    updatedAt: number
    timeline: unknown
    proposer: AccountRef | null
    curator: AccountRef | null
    beneficiary: AccountRef | null
}

export interface ChildBountyRow {
    id: string
    childIndex: number
    value: string
    fee: string | null
    description: string | null
    status: string
    payout: string | null
    updatedAt: number
    curator: AccountRef | null
    beneficiary: AccountRef | null
}

const BOUNTY_FIELDS = `id index value fee description status unlockAt updateDue payout createdAt updatedAt timeline proposer { ${ACCOUNT_REF} } curator { ${ACCOUNT_REF} } beneficiary { ${ACCOUNT_REF} }`


export function bountyDetail(index: number, page: Slice) {
    return gql<{bounties: BountyRow[]; childBounties: ChildBountyRow[]; childCount: {totalCount: number}}>(
        `query ($index: Int!, $limit: Int!, $offset: Int!) {
            bounties(where: {index_eq: $index}, limit: 1) { ${BOUNTY_FIELDS} }
            childBounties(where: {parent: {index_eq: $index}}, orderBy: childIndex_ASC, limit: $limit, offset: $offset) { id childIndex value fee description status payout updatedAt curator { ${ACCOUNT_REF} } beneficiary { ${ACCOUNT_REF} } }
            childCount: childBountiesConnection(where: {parent: {index_eq: $index}}, orderBy: id_ASC) { totalCount }
        }`,
        {index, limit: page.limit, offset: page.offset}
    )
}

export function accountRefs(ids: string[]) {
    return gql<{accounts: AccountRef[]}>(
        `query ($ids: [String!]) {
            accounts(where: {id_in: $ids}, limit: ${Math.max(1, ids.length)}) { ${ACCOUNT_REF} }
        }`,
        {ids}
    )
}

export function governanceSummary() {
    return gql<{
        dailyStats: {issuanceTotal: string; issuanceInactive: string; treasuryPot: string}[]
        refs: {totalCount: number}
        ongoing: {totalCount: number}
        spends: {totalCount: number}
        tracks: {totalCount: number}
        delegates: {totalCount: number}
        trackList: {id: string; name: string}[]
    }>(
        `query {
            dailyStats(orderBy: date_DESC, limit: 1) { issuanceTotal issuanceInactive treasuryPot }
            refs: referendumsConnection(orderBy: index_ASC) { totalCount }
            ongoing: referendumsConnection(orderBy: index_ASC, where: {status_eq: Ongoing}) { totalCount }
            spends: treasurySpendsConnection(orderBy: block_DESC) { totalCount }
            tracks: tracksConnection(orderBy: index_ASC) { totalCount }
            delegates: delegatesConnection(orderBy: id_ASC) { totalCount }
            trackList: tracks(orderBy: index_ASC) { id name }
        }`
    )
}

export function referendaPage(limit: number, offset: number, track?: string) {
    const decl = track ? '($limit: Int!, $offset: Int!, $track: String!)' : '($limit: Int!, $offset: Int!)'
    const where = track ? 'where: {track: {id_eq: $track}}, ' : ''
    return gql<{referendums: ReferendumRow[]; conn: {totalCount: number}}>(
        `query ${decl} {
            referendums(${where}orderBy: index_DESC, limit: $limit, offset: $offset) { ${REFERENDUM_FIELDS} }
            conn: referendumsConnection(${where}orderBy: index_ASC) { totalCount }
        }`,
        {limit, offset, track}
    )
}

export type Facets = Record<string, string[]>
export type Selected = Record<string, string>

// track hangs off the referendum, the other fields sit on the row itself
const pred = (field: string, value: string) => (field === 'track' ? `referendum: {track: {id_eq: "${value}"}}` : `${field}_eq: "${value}"`)

// each chip counts the set it would produce, keeping the other dimensions on
async function facetPage<T>(entity: string, sel: string, order: string, limit: number, offset: number, facets: Facets, on: Selected) {
    const active = (skip?: string) =>
        Object.entries(on)
            .filter(([f, v]) => v && f !== skip)
            .map(([f, v]) => pred(f, v))
    const tallies = Object.entries(facets).flatMap(([field, values]) =>
        values.map((v, i) => `${field}${i}: ${entity}Connection(${clause([...active(field), pred(field, v)])}orderBy: id_ASC) { totalCount }`)
    )
    const raw = await gql<Record<string, never>>(
        `query ($limit: Int!, $offset: Int!) {
            rows: ${entity}(${clause(active())}orderBy: ${order}, limit: $limit, offset: $offset) { ${sel} }
            conn: ${entity}Connection(${clause(active())}orderBy: id_ASC) { totalCount }
            all: ${entity}Connection(orderBy: id_ASC) { totalCount }
            ${tallies.join('\n            ')}
        }`,
        {limit, offset}
    )
    const box = raw as unknown as Record<string, {totalCount: number}> & {rows: T[]}
    const counts: Record<string, Record<string, number>> = {}
    for (const [field, values] of Object.entries(facets)) {
        counts[field] = Object.fromEntries(values.map((v, i) => [v, box[`${field}${i}`]?.totalCount ?? 0]))
    }
    return {rows: box.rows, total: box.conn.totalCount, all: box.all.totalCount, counts}
}

const SPEND_FIELDS = `id kind amount status block referendum { index status } beneficiary { ${ACCOUNT_REF} }`

export function treasurySpendsPage(limit: number, offset: number, facets: Facets, on: Selected) {
    return facetPage<TreasurySpendRow>('treasurySpends', SPEND_FIELDS, '[block_DESC, indexInBlock_DESC, id_DESC]', limit, offset, facets, on)
}

export function bountiesPage(limit: number, offset: number, facets: Facets, on: Selected) {
    return facetPage<BountyRow>('bounties', `${BOUNTY_FIELDS} referendum { index status }`, 'index_DESC', limit, offset, facets, on)
}

/** The bounties a proposal names, for what each one is worth. */
export function bountiesByIndex(indices: number[]) {
    return gql<{bounties: {index: number; value: string}[]}>(
        `query ($i: [Int!]) {
            bounties(where: {index_in: $i}, orderBy: index_ASC, limit: 500) { index value }
        }`,
        {i: indices}
    )
}

export function tracksPage(limit: number, offset: number) {
    return gql<{tracks: TrackRow[]}>(
        `query ($limit: Int!, $offset: Int!) {
            tracks(orderBy: index_ASC, limit: $limit, offset: $offset) { ${TRACK_FIELDS} }
        }`,
        {limit, offset}
    )
}

export function primeState() {
    return gql<{primeStates: {since: number; account: AccountRef}[]}>(
        `query {
            primeStates(limit: 1) { since account { ${ACCOUNT_REF} } }
        }`
    )
}

export interface VoteRow extends VoteShape {
    id: string
    block: number
    removed: boolean
    voter?: AccountRef
    referendum: {index: number; status?: string; endedAt?: number | null}
}

const VOTE_FIELDS = `id kind aye conviction balance ayeAmount nayAmount abstainAmount block removed`

export interface TallySnapshotRow {
    block: number
    ayes: string
    nays: string
    support: string
    totalIssuance: string
    inactiveIssuance: string
}

export interface VotingActionRow extends VoteShape {
    id: string
    method: string
    delegatedVotes: string
    approvalPart: string | null
    approvalWhole: string | null
    supportPart: string | null
    supportWhole: string | null
    block: number
    timestamp: string
    voter: AccountRef
    delegator: AccountRef | null
}

export interface MetadataActionRow {
    id: string
    method: string
    hash: string
    title: string | null
    description: string | null
    block: number
    timestamp: string
}

// the lists a referendum's standing votes fall into, each ordered by the
// amounts its rows lead with, biggest first
export const VOTE_LISTS = {
    aye: {where: 'kind_eq: "Standard", aye_eq: true', lead: ['balance']},
    nay: {where: 'kind_eq: "Standard", aye_eq: false', lead: ['balance']},
    abstain: {where: 'kind_eq: "SplitAbstain"', lead: ['abstainAmount', 'ayeAmount', 'nayAmount']},
    split: {where: 'kind_eq: "Split"', lead: ['ayeAmount', 'nayAmount']},
} as const satisfies Record<string, {where: string; lead: readonly (keyof VoteShape)[]}>

export type VoteList = keyof typeof VOTE_LISTS

export const VOTE_LIST_KEYS = Object.keys(VOTE_LISTS) as VoteList[]

export interface ReferendumVoteRow extends VoteRow {
    voter: AccountRef
}

export function referendumVotes(index: number, list: VoteList, page: Slice) {
    const {where, lead} = VOTE_LISTS[list]
    return gql<{votes: ReferendumVoteRow[]}>(
        `query ($index: Int!, $limit: Int!, $offset: Int!) {
            votes(where: {referendum: {index_eq: $index}, removed_eq: false, ${where}}, orderBy: [${lead.map(f => `${f}_DESC`).join(', ')}, id_ASC], limit: $limit, offset: $offset) { ${VOTE_FIELDS} voter { ${ACCOUNT_REF} } referendum { index } }
        }`,
        {index, ...page}
    ).then(r => r.votes)
}

export function referendumDetail(index: number, page: Slice) {
    const tally = (list: VoteList) => `votesConnection(where: {referendum: {index_eq: $index}, removed_eq: false, ${VOTE_LISTS[list].where}}, orderBy: id_ASC) { totalCount }`
    return gql<{
        referendums: ReferendumDetailRow[]
        spends: ReferendumSpendRow[]
        metadataActions: MetadataActionRow[]
        metadataCount: {totalCount: number}
        dailyStats: {issuanceTotal: string; issuanceInactive: string}[]
        voteCount: {totalCount: number}
        ayeCount: {totalCount: number}
        nayCount: {totalCount: number}
        abstainCount: {totalCount: number}
        splitCount: {totalCount: number}
    }>(
        `query ($index: Int!, $limit: Int!, $offset: Int!) {
            referendums(where: {index_eq: $index}, limit: 1) { ${REFERENDUM_FIELDS} proposalCalls }
            spends: treasurySpends(where: {referendum: {index_eq: $index}}, orderBy: [block_ASC, indexInBlock_ASC], limit: 500) { id kind status validFrom expireAt paidAt proposalCall }
            metadataActions(where: {referendum: {index_eq: $index}}, orderBy: [block_DESC, id_DESC], limit: $limit, offset: $offset) { id method hash title description block timestamp }
            metadataCount: metadataActionsConnection(where: {referendum: {index_eq: $index}}, orderBy: id_ASC) { totalCount }
            dailyStats(orderBy: date_DESC, limit: 1) { issuanceTotal issuanceInactive }
            voteCount: votesConnection(where: {referendum: {index_eq: $index}, removed_eq: false}, orderBy: id_ASC) { totalCount }
            ayeCount: ${tally('aye')}
            nayCount: ${tally('nay')}
            abstainCount: ${tally('abstain')}
            splitCount: ${tally('split')}
        }`,
        {index, limit: page.limit, offset: page.offset}
    )
}

export interface BallotVote extends VoteShape {
    voter: {id: string}
}

export interface BallotDelegation {
    conviction: string
    balance: string
    voter: {id: string}
}

// every standing vote on a referendum and every delegation it counts, each
// page in one request so a batch landing in between cannot take a vote away
// from under the delegations it carries
export async function referendumBallots(index: number): Promise<{votes: BallotVote[]; delegations: BallotDelegation[]}> {
    const votes: BallotVote[] = []
    const delegations: BallotDelegation[] = []
    for (let offset = 0; ; offset += SWEEP) {
        const page = await gql<{votes: BallotVote[]; delegatedVotes: BallotDelegation[]}>(
            `query ($index: Int!, $limit: Int!, $offset: Int!) {
                votes(where: {referendum: {index_eq: $index}, removed_eq: false}, orderBy: id_ASC, limit: $limit, offset: $offset) { kind aye conviction balance ayeAmount nayAmount abstainAmount voter { id } }
                delegatedVotes(where: {referendum: {index_eq: $index}, removed_eq: false}, orderBy: id_ASC, limit: $limit, offset: $offset) { conviction balance voter { id } }
            }`,
            {index, limit: SWEEP, offset}
        )
        votes.push(...page.votes)
        delegations.push(...page.delegatedVotes)
        if (page.votes.length < SWEEP && page.delegatedVotes.length < SWEEP) return {votes, delegations}
    }
}

// the curves plot every snapshot
export function tallySnapshots(index: number) {
    return sweep(page =>
        gql<{snapshots: TallySnapshotRow[]}>(
            `query ($index: Int!, $limit: Int!, $offset: Int!) {
                snapshots: referendumTallySnapshots(where: {referendum: {index_eq: $index}}, orderBy: block_ASC, limit: $limit, offset: $offset) { block ayes nays support totalIssuance inactiveIssuance }
            }`,
            {index, ...page}
        ).then(r => r.snapshots)
    )
}

// the methods behind each kind of action, and the impact field and side
// behind each move
const ACTION_METHOD: Record<ActionKind, string> = {vote: 'Voted', remove: 'VoteRemoved', delegate: 'Delegated', undelegate: 'Undelegated'}
const MOVE_WHERE: Record<ActionMove, string> = {'approval-up': 'approvalPart_gt', 'approval-down': 'approvalPart_lt', 'support-up': 'supportPart_gt', 'support-down': 'supportPart_lt'}

// an address finds the one account, any other text its names
export interface AccountSearch {
    account?: string
    name?: string
}

export function accountSearch(q: string, ss58: number): AccountSearch {
    if (!q) return {}
    const account = ss58TryDecode(q, ss58) ?? (isH256(q) ? q.toLowerCase() : null)
    return account != null ? {account} : {name: q}
}

export interface ActionFilter extends AccountSearch {
    kind?: ActionKind
    move?: ActionMove
}

// an account matches by the names the search page matches it by
const nameMatch = (v: string) => `{OR: [{identityDisplay_containsInsensitive: ${v}}, {identitySubName_containsInsensitive: ${v}}, {username_containsInsensitive: ${v}}]}`

export function referendumActions(index: number, {kind, move, account, name}: ActionFilter, page: Slice) {
    // an OR next to other fields joins them as one more alternative, so the
    // match on either party sits under an AND
    const party = (match: string) => `AND: {OR: [{voter: ${match}}, {delegator: ${match}}]}`
    const where = [
        'referendum: {index_eq: $index}',
        kind && `method_eq: "${ACTION_METHOD[kind]}"`,
        move && `${MOVE_WHERE[move]}: "0"`,
        account != null && party('{id_eq: $account}'),
        name != null && party(nameMatch('$name')),
    ]
        .filter(Boolean)
        .join(', ')
    const vars = [account != null && '$account: String!', name != null && '$name: String!'].filter(Boolean).join(', ')
    return gql<{actions: VotingActionRow[]; conn: {totalCount: number}}>(
        `query ($index: Int!, ${vars ? `${vars}, ` : ''}$limit: Int!, $offset: Int!) {
            actions: votingActions(where: {${where}}, orderBy: [block_DESC, indexInBlock_DESC], limit: $limit, offset: $offset) { id method kind aye conviction balance ayeAmount nayAmount abstainAmount delegatedVotes approvalPart approvalWhole supportPart supportWhole block timestamp voter { ${ACCOUNT_REF} } delegator { ${ACCOUNT_REF} } }
            conn: votingActionsConnection(where: {${where}}, orderBy: id_ASC) { totalCount }
        }`,
        {index, ...(account != null && {account}), ...(name != null && {name}), ...page}
    )
}

export interface TimelineEventRow {
    id: string
    indexInBlock: number
    args: unknown
    extrinsic: {id: string} | null
}

export function eventsByIds(ids: string[]): Promise<{events: TimelineEventRow[]}> {
    if (ids.length === 0) return Promise.resolve({events: []})
    return gql<{events: TimelineEventRow[]}>(`query ($ids: [String!]) { events(where: {id_in: $ids}, orderBy: ${TIMELINE_ORDER}, limit: 500) { id indexInBlock args extrinsic { id } } }`, {ids})
}

export function trackList() {
    return gql<{tracks: {id: string; name: string}[]}>(`query { tracks(orderBy: index_ASC) { id name } }`)
}

// the columns the delegator list sorts by, ties settled the same way whichever leads
const DELEGATION_SORT_FIELD: Record<DelegationSortBy, string> = {conviction: 'convictionLevel', capital: 'balance', votes: 'votes', since: 'block'}
const delegationOrder = ({by, dir}: DelegationSort) => `[${DELEGATION_SORT_FIELD[by]}_${dir.toUpperCase()}, who_id_ASC, track_index_ASC, id_ASC]`

// track ids are the pallet class numbers, safe to splice into aliases. the
// track counts follow the search so each option says what picking it shows
export async function delegationsInPage(id: string, tracks: string[], track: string, {account, name}: AccountSearch, sort: DelegationSort, limit: number, offset: number) {
    const target = [`target: {id_eq: $id}`, account != null && 'who: {id_eq: $account}', name != null && `who: ${nameMatch('$name')}`].filter(Boolean).join(', ')
    const where = track ? `{${target}, track: {id_eq: "${track}"}}` : `{${target}}`
    const counts = tracks.map(t => `t${t}: delegationsConnection(where: {${target}, track: {id_eq: "${t}"}}, orderBy: id_ASC) { totalCount }`)
    const vars = [account != null && '$account: String!', name != null && '$name: String!'].filter(Boolean).join(', ')
    const raw = await gql<{delegations: DelegationRow[]; conn: {totalCount: number}; all: {totalCount: number}} & Record<string, {totalCount: number}>>(
        `query ($id: String!, ${vars ? `${vars}, ` : ''}$limit: Int!, $offset: Int!) {
            delegations(where: ${where}, orderBy: ${delegationOrder(sort)}, limit: $limit, offset: $offset) { id conviction balance votes block track { id name } who { ${ACCOUNT_REF} } }
            conn: delegationsConnection(where: ${where}, orderBy: id_ASC) { totalCount }
            all: delegationsConnection(where: {${target}}, orderBy: id_ASC) { totalCount }
            ${counts.join('\n            ')}
        }`,
        {id, ...(account != null && {account}), ...(name != null && {name}), limit, offset}
    )
    return {
        rows: raw.delegations,
        total: raw.conn.totalCount,
        all: raw.all.totalCount,
        perTrack: Object.fromEntries(tracks.map(t => [t, raw[`t${t}`].totalCount])),
    }
}

export interface DelegateTally {
    delegators: number
    tracks: number
    delegated: string
}

export function delegateTally(id: string) {
    return gql<{delegateById: DelegateTally | null}>(`query ($id: String!) { delegateById(id: $id) { delegators tracks delegated } }`, {id})
}

export interface CountedDelegationRow {
    conviction: string
    balance: string
    voter: {id: string}
    delegator: {id: string}
}

// every delegation the referendum counts through the votes on one page,
// biggest first, identities come later for the few rows on screen
export function countedDelegations(index: number, voters: string[]) {
    return sweep(page =>
        gql<{delegatedVotes: CountedDelegationRow[]}>(
            `query ($index: Int!, $voters: [String!], $limit: Int!, $offset: Int!) {
                delegatedVotes(where: {referendum: {index_eq: $index}, voter: {id_in: $voters}, removed_eq: false}, orderBy: [balance_DESC, delegator_id_ASC, id_ASC], limit: $limit, offset: $offset) { conviction balance voter { id } delegator { id } }
            }`,
            {index, voters, ...page}
        ).then(r => r.delegatedVotes)
    )
}

export interface ValidatorRow {
    id: string
    active: boolean
    lockedAmount: string
    lockExpiry: number | null
    offlineSessions: number
    equivocations: number
    kicked: unknown
    firstSeenBlock: number
    lastActiveSession: number | null
    account: AccountRef
}

const VALIDATOR_FIELDS = `id active lockedAmount lockExpiry offlineSessions equivocations kicked firstSeenBlock lastActiveSession account { ${ACCOUNT_REF} }`

export function validatorsPage(limit: number, offset: number) {
    return gql<{validators: ValidatorRow[]; all: {totalCount: number}; active: {totalCount: number}}>(
        `query ($limit: Int!, $offset: Int!) {
            validators(orderBy: [lastActiveSession_DESC_NULLS_LAST, id_ASC], limit: $limit, offset: $offset) { ${VALIDATOR_FIELDS} }
            all: validatorsConnection(orderBy: id_ASC) { totalCount }
            active: validatorsConnection(orderBy: id_ASC, where: {active_eq: true}) { totalCount }
        }`,
        {limit, offset}
    )
}

export interface MinerDayRow {
    day: string
    blocks: number
    rewards: string
    account: AccountRef
}

const SWEEP = 5000

// rows that only make sense whole are read a page at a time until a page comes back short
async function sweep<T>(read: (page: Slice) => Promise<T[]>): Promise<T[]> {
    const rows: T[] = []
    for (let offset = 0; ; offset += SWEEP) {
        const batch = await read({limit: SWEEP, offset})
        rows.push(...batch)
        if (batch.length < SWEEP) return rows
    }
}

// a long window over many miners runs past any single page
export function minerDays(sinceDay: string | null): Promise<MinerDayRow[]> {
    return sweep(page =>
        gql<{minerDayStats: MinerDayRow[]}>(
            `query ($since: String, $limit: Int!, $offset: Int!) {
                minerDayStats(where: {day_gte: $since}, orderBy: id_ASC, limit: $limit, offset: $offset) { day blocks rewards account { ${ACCOUNT_REF} } }
            }`,
            {since: sinceDay, ...page}
        ).then(r => r.minerDayStats)
    )
}

export function chartSeries(after: string, before: string) {
    const day = [after && `date_gte: "${after}T00:00:00.000Z"`, before && `date_lte: "${before}T00:00:00.000Z"`].filter(Boolean)
    return gql<{dailyStats: DailyRow[]}>(
        `query {
            dailyStats(${clause(day)}orderBy: date_ASC) { ${DAILY_FIELDS} }
        }`
    )
}

export function searchLookups(hex66: string) {
    return gql<{byHash: {height: number}[]; ext: {id: string}[]; evm: {id: string}[]}>(
        `query ($h: String!) {
            byHash: blocks(where: {OR: [{hash_eq: $h}, {evmHash_eq: $h}]}, limit: 1) { height }
            ext: extrinsics(where: {hash_eq: $h}, limit: 1) { id }
            evm: evmTransactions(where: {id_eq: $h}, limit: 1) { id }
        }`,
        {h: hex66}
    )
}

export function isTokenAddress(address: string) {
    return gql<{tokens: {id: string}[]}>(`query ($a: String!) { tokens(where: {id_eq: $a}, limit: 1) { id } }`, {a: address}).then(r => r.tokens.length > 0)
}

export interface TokenHit extends TokenPair {
    id: string
    name: string | null
    symbol: string | null
}

// accounts sort by the name they show, their own display, else their super's
// display and sub name, else their username
const LABEL_ORDER = '[identityDisplay_ASC_NULLS_LAST, identitySuper_identityDisplay_ASC_NULLS_LAST, identitySubName_ASC_NULLS_LAST, username_ASC_NULLS_LAST, id_ASC]'

export function searchNames(q: string, page: Slice) {
    const account = nameMatch('$q')
    const token = '{OR: [{symbol_containsInsensitive: $q}, {name_containsInsensitive: $q}]}'
    return gql<{accounts: AccountRef[]; accountCount: {totalCount: number}; tokens: TokenHit[]; tokenCount: {totalCount: number}}>(
        `query ($q: String!, $limit: Int!, $offset: Int!) {
            accounts(where: ${account}, orderBy: ${LABEL_ORDER}, limit: $limit, offset: $offset) { ${ACCOUNT_REF} }
            accountCount: accountsConnection(where: ${account}, orderBy: id_ASC) { totalCount }
            tokens(where: ${token}, orderBy: ${TOKEN_ORDER}, limit: $limit, offset: $offset) { id name symbol ${PAIR_FIELDS} }
            tokenCount: tokensConnection(where: ${token}, orderBy: id_ASC) { totalCount }
        }`,
        {q, limit: page.limit, offset: page.offset}
    )
}

export interface IndexerStatus {
    blocks: {height: number; timestamp: string | null}[]
    chainInfos: {head: number; blockTime: number}[]
}

export function indexerStatus() {
    return gql<IndexerStatus>(`query {
        blocks(orderBy: height_DESC, limit: 1) { height timestamp }
        chainInfos(limit: 1) { head blockTime }
    }`)
}
