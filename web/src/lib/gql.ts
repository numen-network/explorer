import type {VoteShape} from './conviction'

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
}

export interface BlockRow {
    id: string
    height: number
    hash: string
    parentHash: string
    timestamp: string
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
    faceCount: number
}

export interface CallRef {
    pallet: string
    method: string
}

export interface TransferRow {
    id: string
    amount: string
    timestamp: string
    call: CallRef | null
    from: AccountRef
    to: AccountRef
    block: {height: number}
    extrinsic: {id: string; hash: string} | null
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
const ACCOUNT_REF = `id identityDisplay identityJson identitySubName identitySubData identitySuper { identityDisplay identityJson }`

const BLOCK_FIELDS = `id height hash parentHash timestamp finalized extrinsicCount eventCount difficulty reward minerFees treasuryFees nonce workHash specVersion author { ${ACCOUNT_REF} }`
const TRANSFER_FIELDS = `id amount timestamp call { pallet method } from { ${ACCOUNT_REF} } to { ${ACCOUNT_REF} } block { height } extrinsic { id hash }`
const DAILY_FIELDS = `id date blocks extrinsicsSigned transfers transferVolume evmTxs fees tsFirst tsLast issuanceTotal issuanceInactive issuanceTransferable treasuryPot cumExtrinsicsSigned cumTransfers cumTransferVolume difficultyClose accountsTotal referendaTotal minersActive rewards`

export interface HomeData {
    blocks: BlockRow[]
    genesis: {hash: string}[]
    minedObjects: ObjectRow[]
    transfers: TransferRow[]
    dailyStats: DailyRow[]
    accounts: {totalCount: number}
    validators: {totalCount: number}
    sessionHead: {lastActiveSession: number}[]
    topology: TopologyRow[]
    evmTotal: {totalCount: number}
    referendums: ReferendumRow[]
    fresh24: {totalCount: number}
    fresh30: {totalCount: number}
}

export function homeData(since24: string, since30: string) {
    return gql<HomeData>(
        `query ($since24: DateTime!, $since30: DateTime!) {
            blocks(orderBy: height_DESC, limit: 1) { ${BLOCK_FIELDS} }
            genesis: blocks(where: {height_eq: 0}, limit: 1) { hash }
            minedObjects(orderBy: id_DESC, limit: 5) { block { height hash timestamp finalized extrinsicCount eventCount workHash author { ${ACCOUNT_REF} } } protocol vertices }
            transfers(orderBy: timestamp_DESC, limit: 5) { ${TRANSFER_FIELDS} }
            dailyStats(orderBy: date_DESC, limit: 90) { ${DAILY_FIELDS} }
            accounts: accountsConnection(orderBy: id_ASC) { totalCount }
            validators: validatorsConnection(orderBy: id_ASC, where: {active_eq: true}) { totalCount }
            sessionHead: validators(orderBy: lastActiveSession_DESC, limit: 1) { lastActiveSession }
            topology: meshTopologies(limit: 1) { id faces faceCount }
            evmTotal: evmTransactionsConnection(orderBy: id_ASC) { totalCount }
            referendums(orderBy: index_DESC, limit: 5) { ${REFERENDUM_FIELDS} }
            fresh24: accountsConnection(orderBy: id_ASC, where: {firstSeenTimestamp_gt: $since24}) { totalCount }
            fresh30: accountsConnection(orderBy: id_ASC, where: {firstSeenTimestamp_gt: $since30}) { totalCount }
        }`,
        {since24, since30}
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
    lastActiveBlock: number
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
    success: boolean
    error: unknown
    fee: string | null
    tip: string | null
    minerFee: string
    treasuryFee: string
    signer: AccountRef | null
    block: {height: number; timestamp: string}
}

export interface CallRow {
    id: string
    address: number[]
    pallet: string
    method: string
    args: unknown
    success: boolean
    origin: AccountRef | null
}

export interface EventRow {
    id: string
    indexInBlock: number
    phase: string
    pallet: string
    method: string
    args: unknown
    call: {id: string} & CallRef | null
    extrinsic: {id: string; hash: string} | null
}

const EXTRINSIC_FIELDS = `id indexInBlock hash pallet method success error fee tip minerFee treasuryFee signer { ${ACCOUNT_REF} } block { height timestamp }`
const EVENT_FIELDS = `id indexInBlock phase pallet method args call { id pallet method } extrinsic { id hash }`

export interface Slice {
    limit: number
    offset: number
}

// the block row carries extrinsicCount and eventCount, so the totals the pagers
// need come free and no connection query is required
export function blockDetail(idOrHash: string, page: Slice) {
    const byHeight = /^\d+$/.test(idOrHash)
    const where = byHeight ? '{height_eq: $height}' : '{hash_eq: $hash}'
    return gql<{
        blocks: BlockRow[]
        extrinsics: ExtrinsicRow[]
        events: EventRow[]
        minedObjects: {protocol: string; vertexCount: number; vertices: string}[]
        topology: TopologyRow[]
    }>(
        `query (${byHeight ? '$height: Int!' : '$hash: String!'}, $limit: Int!, $offset: Int!) {
            blocks(where: ${where}, limit: 1) { ${BLOCK_FIELDS} logs }
            extrinsics(where: {block: ${where}}, orderBy: indexInBlock_ASC, limit: $limit, offset: $offset) { ${EXTRINSIC_FIELDS} }
            events(where: {block: ${where}}, orderBy: indexInBlock_ASC, limit: $limit, offset: $offset) { ${EVENT_FIELDS} }
            minedObjects(where: {block: ${where}}, limit: 1) { protocol vertexCount vertices }
            topology: meshTopologies(limit: 1) { id faces faceCount }
        }`,
        {...(byHeight ? {height: Number(idOrHash)} : {hash: idOrHash.toLowerCase()}), limit: page.limit, offset: page.offset}
    )
}

export type ExtrinsicHit = Pick<ExtrinsicRow, 'id' | 'indexInBlock' | 'hash' | 'pallet' | 'method' | 'success' | 'block'>

// a hash can name more than one extrinsic, the canonical pair never can
export function extrinsicMatches(hash: string) {
    return gql<{extrinsics: ExtrinsicHit[]}>(
        `query ($h: String!) {
            extrinsics(where: {hash_eq: $h}, orderBy: id_ASC, limit: 20) { id indexInBlock hash pallet method success block { height timestamp } }
        }`,
        {h: hash.toLowerCase()}
    )
}

export function extrinsicDetail(height: number, index: number) {
    const of = `{extrinsic: {block: {height_eq: $height}, indexInBlock_eq: $index}}`
    return gql<{
        extrinsics: ExtrinsicRow[]
        calls: CallRow[]
        events: EventRow[]
        evm: {id: string}[]
    }>(
        `query ($height: Int!, $index: Int!) {
            extrinsics(where: {block: {height_eq: $height}, indexInBlock_eq: $index}, limit: 1) { ${EXTRINSIC_FIELDS} }
            calls(where: ${of}, orderBy: id_ASC, limit: 500) { id address pallet method args success origin { ${ACCOUNT_REF} } }
            events(where: ${of}, orderBy: indexInBlock_ASC, limit: 200) { ${EVENT_FIELDS} }
            evm: evmTransactions(where: ${of}, limit: 1) { id }
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
    firstSeenTimestamp: string
    lastActiveBlock: number
    identityJson: unknown
    identitySuper?: {id: string; identityDisplay: string | null; identityJson?: unknown} | null
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
    submissionDepositor: string | null
    submissionDeposit: string | null
    decisionDepositor: string | null
    decisionDeposit: string | null
}

// everything the header and the tab strip need and nothing else, the rows a tab
// shows are that tab's own business. counts come back as connection tallies
// except mining, which has no group by and so has to add up its own days
export function accountSummary(idHex: string) {
    const self = `{id_eq: $id}`
    return gql<AccountSummary>(
        `query ($id: String!) {
            accountById(id: $id) { id free reserved balance frozen nonce firstSeenBlock firstSeenTimestamp lastActiveBlock identityDisplay identityJson identitySubName identitySubData identitySuper { id identityDisplay identityJson } evmAddress vestingJson locksJson holdsJson depositsJson }
            validators(where: {account: ${self}}, limit: 1) { ${VALIDATOR_FIELDS} }
            registrar: registrars(where: {account: ${self}}, limit: 1) { index }
            retiredRegistrars: registrars(where: {retiredAt_isNull: false}) { index }
            prime: primeStates(where: {account: ${self}}, limit: 1) { id }
            minerDays: minerDayStats(where: {account: ${self}}, orderBy: day_DESC, limit: 60) { day blocks }
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
            msigPending: multisigOps(where: {depositor: ${self}, status_in: ["NewMultisig", "MultisigApproval"]}, orderBy: id_ASC, limit: 100) { threshold deposit }
            govDeposits: referendums(where: {OR: [{submissionDepositor_eq: $id}, {decisionDepositor_eq: $id}]}, orderBy: index_ASC, limit: 100) {
                index submissionDepositor submissionDeposit decisionDepositor decisionDeposit
            }
            bountyDeposits: bounties(where: {OR: [{proposer: ${self}}, {curator: ${self}}]}, orderBy: index_ASC, limit: 100) {
                index bond curatorDeposit proposer { id } curator { id }
            }
            childBountyDeposits: childBounties(where: {curator: ${self}}, orderBy: id_ASC, limit: 100) {
                parent { index } childIndex curatorDeposit
            }
            nVotes: votesConnection(orderBy: id_ASC, where: {voter: ${self}}) { totalCount }
        }`,
        {id: idHex}
    )
}

export async function tokenTransferCount(address: string) {
    const {conn} = await gql<{conn: {totalCount: number}}>(
        `query ($a: String!) { conn: tokenTransfersConnection(orderBy: id_ASC, where: {OR: [{from_eq: $a}, {to_eq: $a}]}) { totalCount } }`,
        {a: address}
    )
    return conn.totalCount
}

export function votesFor(idHex: string) {
    return gql<{votes: VoteRow[]}>(
        `query ($id: String!) { votes(where: {voter: {id_eq: $id}}, orderBy: block_DESC, limit: 100) { ${VOTE_FIELDS} referendum { index status endedAt } } }`,
        {id: idHex}
    )
}

export function delegationsOutFor(idHex: string) {
    return gql<{delegations: DelegationRow[]}>(
        `query ($id: String!) {
            delegations(where: {who: {id_eq: $id}}, orderBy: track_id_ASC, limit: 100) { id conviction balance block track { id name } target { ${ACCOUNT_REF} } }
        }`,
        {id: idHex}
    )
}

export function proxiesFor(idHex: string) {
    return gql<{out: ProxyRow[]; in: ProxyRow[]}>(
        `query ($id: String!) {
            out: proxyRelations(where: {delegator: {id_eq: $id}}, orderBy: id_ASC, limit: 100) { id proxyType delay delegatee { ${ACCOUNT_REF} } }
            in: proxyRelations(where: {delegatee: {id_eq: $id}}, orderBy: id_ASC, limit: 100) { id proxyType delay delegator { ${ACCOUNT_REF} } }
        }`,
        {id: idHex}
    )
}

export function multisigOpsFor(idHex: string) {
    return gql<{multisigOps: MultisigOpRow[]}>(
        `query ($id: String!) {
            multisigOps(where: {OR: [{multisig: {id_eq: $id}}, {depositor: {id_eq: $id}}]}, orderBy: updatedBlock_DESC, limit: 100) {
                id callHash approvals threshold signatories status result createdBlock updatedBlock
                multisig { ${ACCOUNT_REF} } depositor { ${ACCOUNT_REF} }
            }
        }`,
        {id: idHex}
    )
}

// most accounts have deployed nothing, so the token lookup only runs when the
// first query finds contracts to look up
export async function evmDeployments(address: string): Promise<{contracts: number; tokens: number}> {
    const {deploys} = await gql<{deploys: {contractAddress: string}[]}>(
        `query ($a: String!) { deploys: evmTransactions(where: {from_eq: $a, contractAddress_isNull: false}, limit: 100) { contractAddress } }`,
        {a: address}
    )
    if (deploys.length === 0) return {contracts: 0, tokens: 0}
    const ids = deploys.map(d => d.contractAddress)
    const {tokens} = await gql<{tokens: {id: string}[]}>(
        `query ($ids: [String!]!) { tokens(where: {id_in: $ids}, limit: 100) { id } }`,
        {ids}
    )
    return {contracts: deploys.length, tokens: tokens.length}
}

export function transfersPage(limit: number, offset: number) {
    return gql<{transfers: TransferRow[]; conn: {totalCount: number}}>(
        `query ($limit: Int!, $offset: Int!) {
            transfers(orderBy: timestamp_DESC, limit: $limit, offset: $offset) { ${TRANSFER_FIELDS} }
            conn: transfersConnection(orderBy: timestamp_DESC) { totalCount }
        }`,
        {limit, offset}
    )
}

export interface IdentityRow extends AccountRef {
    identityJson: unknown
    username: string | null
    subs: {id: string; identitySubName: string | null}[]
}

const HAS_IDENTITY = '{identityJson_isNull: false}'

// the verdict behind each badge is read off the registration itself, so the
// tallies walk every registration rather than a column
const IDENTITY_SWEEP = 10000

export function identityCounts() {
    return gql<{registered: {id: string; identityJson: unknown}[]; subs: {totalCount: number}}>(
        `query {
            registered: accounts(where: ${HAS_IDENTITY}, orderBy: id_ASC, limit: ${IDENTITY_SWEEP}) { id identityJson }
            subs: accountsConnection(orderBy: id_ASC, where: {identitySuper_isNull: false}) { totalCount }
        }`
    )
}

export function identitiesPage(limit: number, offset: number) {
    return gql<{accounts: IdentityRow[]}>(
        `query ($limit: Int!, $offset: Int!) {
            accounts(where: ${HAS_IDENTITY}, orderBy: identityDisplay_ASC_NULLS_LAST, limit: $limit, offset: $offset) {
                id identityDisplay identityJson username subs { id identitySubName }
            }
        }`,
        {limit, offset}
    )
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

export function registrarsList() {
    return gql<{registrars: RegistrarRow[]}>(
        `query {
            registrars(orderBy: index_ASC, limit: 100) {
                id index fee addedAt retiredAt requestCount givenCount lastJudgementBlock lastJudgementAt
                account { ${ACCOUNT_REF} }
            }
        }`
    )
}

export function transfersFor(idHex: string, dir: 'in' | 'out' | '', limit: number, offset: number) {
    const side = dir === 'out' ? '{from: {id_eq: $id}}' : dir === 'in' ? '{to: {id_eq: $id}}' : '{OR: [{from: {id_eq: $id}}, {to: {id_eq: $id}}]}'
    return gql<{transfers: TransferRow[]; conn: {totalCount: number}}>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            transfers(where: ${side}, orderBy: timestamp_DESC, limit: $limit, offset: $offset) { ${TRANSFER_FIELDS} }
            conn: transfersConnection(where: ${side}, orderBy: id_ASC) { totalCount }
        }`,
        {id: idHex, limit, offset}
    )
}

export function tokenTransfersFor(address: string, limit: number, offset: number) {
    return gql<{tokenTransfers: TokenTransferRow[]; conn: {totalCount: number}}>(
        `query ($a: String!, $limit: Int!, $offset: Int!) {
            tokenTransfers(where: {OR: [{from_eq: $a}, {to_eq: $a}]}, orderBy: timestamp_DESC, limit: $limit, offset: $offset) { ${TOKEN_TRANSFER_FIELDS} }
            conn: tokenTransfersConnection(where: {OR: [{from_eq: $a}, {to_eq: $a}]}, orderBy: id_ASC) { totalCount }
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
    result?: 'success' | 'failed'
    after?: string
    before?: string
}

// every value here is checked against the call list or a shape before it lands
// in the query, so the clause can be built by hand
function extrinsicParts(f: ExtrinsicFilter, skipCall = false): string[] {
    const parts: string[] = []
    if (f.pallet && !skipCall) parts.push(`pallet_eq: "${f.pallet}"`)
    if (f.method && !skipCall) parts.push(`method_eq: "${f.method}"`)
    if (f.signer) parts.push(`signer: {id_eq: "${f.signer}"}`)
    if (f.result) parts.push(`success_eq: ${f.result === 'success'}`)
    const span: string[] = []
    if (f.after) span.push(`timestamp_gte: "${f.after}T00:00:00.000Z"`)
    if (f.before) span.push(`timestamp_lte: "${f.before}T23:59:59.999Z"`)
    if (span.length) parts.push(`block: {${span.join(', ')}}`)
    return parts
}

const clause = (parts: string[]) => (parts.length ? `where: {${parts.join(', ')}}, ` : '')

export async function extrinsicsPage(limit: number, offset: number, f: ExtrinsicFilter, pallets: string[]) {
    const w = clause(extrinsicParts(f))
    // each pallet chip counts what it would show, with the other filters still on
    const others = extrinsicParts(f, true)
    const tallies = pallets.map(
        (p, i) => `p${i}: extrinsicsConnection(${clause([...others, `pallet_eq: "${p}"`])}orderBy: id_ASC) { totalCount }`
    )
    const raw = await gql<Record<string, never>>(
        `query ($limit: Int!, $offset: Int!) {
            rows: extrinsics(${w}orderBy: block_height_DESC, limit: $limit, offset: $offset) { ${EXTRINSIC_FIELDS} }
            conn: extrinsicsConnection(${w}orderBy: id_ASC) { totalCount }
            ${tallies.join('\n            ')}
        }`,
        {limit, offset}
    )
    const box = raw as unknown as Record<string, {totalCount: number}> & {rows: ExtrinsicRow[]}
    return {
        rows: box.rows,
        total: box.conn.totalCount,
        counts: Object.fromEntries(pallets.map((p, i) => [p, box[`p${i}`]?.totalCount ?? 0])),
        leaves: await leafCalls(box.rows.map(r => r.id)),
    }
}

/**
 * What a list of wrappers actually ran, keyed by extrinsic. The root is left
 * out because the row already names it, and a call holding children is another
 * wrapper, so only the leaves survive.
 */
export async function leafCalls(ids: string[]): Promise<Map<string, CallRef[]>> {
    const out = new Map<string, CallRef[]>()
    if (ids.length === 0) return out
    const {calls} = await gql<{calls: {id: string; pallet: string; method: string; extrinsic: {id: string}; parent: {id: string} | null}[]}>(
        `query ($ids: [String!]!) {
            calls(where: {extrinsic: {id_in: $ids}, parent_isNull: false}, orderBy: id_ASC, limit: 2000) {
                id pallet method extrinsic { id } parent { id }
            }
        }`,
        {ids}
    )
    const wrappers = new Set(calls.map(c => c.parent?.id))
    for (const c of calls) {
        if (wrappers.has(c.id)) continue
        const arr = out.get(c.extrinsic.id) ?? []
        arr.push({pallet: c.pallet, method: c.method})
        out.set(c.extrinsic.id, arr)
    }
    return out
}

export interface IdentityEventRow {
    id: string
    method: string
    args: unknown
    block: {height: number; timestamp: string}
    call: {method: string; args: unknown} | null
    extrinsic: {id: string; hash: string} | null
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
            events(where: ${where}, orderBy: block_height_DESC, limit: $limit, offset: $offset) { id method args block { height timestamp } call { method args } extrinsic { id hash } }
            conn: eventsConnection(orderBy: block_height_DESC, where: ${where}) { totalCount }
        }`,
        {limit, offset}
    )
}

export function subIdentitiesPage(idHex: string, limit: number, offset: number) {
    return gql<{accounts: {id: string; identitySubName: string | null}[]; conn: {totalCount: number}}>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            accounts(where: {identitySuper: {id_eq: $id}}, orderBy: identitySubName_ASC_NULLS_LAST, limit: $limit, offset: $offset) { id identitySubName }
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
            judgements(where: {registrar: {index_eq: $index}}, orderBy: block_DESC, limit: $limit, offset: $offset) {
                id kind fee block timestamp target { ${ACCOUNT_REF} }
            }
            conn: judgementsConnection(orderBy: block_DESC, where: {registrar: {index_eq: $index}}) { totalCount }
        }`,
        {index, limit, offset}
    )
}

export interface TokenRow {
    id: string
    name: string | null
    symbol: string | null
    decimals: number | null
    totalSupply: string | null
    holderCount: number
    transferCount: number
    deployBlock: number | null
    firstBlock: number
}

const TOKEN_FIELDS = `id name symbol decimals totalSupply holderCount transferCount deployBlock firstBlock`

export function tokensPage(limit: number, offset: number) {
    return gql<{tokens: TokenRow[]; conn: {totalCount: number}}>(
        `query ($limit: Int!, $offset: Int!) {
            tokens(orderBy: transferCount_DESC, limit: $limit, offset: $offset) { ${TOKEN_FIELDS} }
            conn: tokensConnection(orderBy: id_ASC) { totalCount }
        }`,
        {limit, offset}
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

export function tokenDetail(address: string) {
    return gql<{
        tokenById: TokenRow | null
        tokenHolders: {id: string; address: string; balance: string | null}[]
        tokenTransfers: TokenTransferRow[]
    }>(
        `query ($id: String!) {
            tokenById(id: $id) { ${TOKEN_FIELDS} }
            tokenHolders(where: {token: {id_eq: $id}}, orderBy: balance_DESC_NULLS_LAST, limit: 25) { id address balance }
            tokenTransfers(where: {token: {id_eq: $id}}, orderBy: timestamp_DESC, limit: 20) { ${TOKEN_TRANSFER_FIELDS} }
        }`,
        {id: address}
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
    extrinsic: {id: string; hash: string}
}

export interface EvmTxDetailRow extends EvmTxRow {
    extrinsic: {id: string; hash: string; transfers: TransferRow[]}
}

const EVM_TX_FIELDS = `id txIndex from to contractAddress value input inputSelector nonce gasLimit gasUsed gasPrice txType status exitReason timestamp block { height } extrinsic { id hash }`

export function evmTxDetail(hash: string) {
    return gql<{
        evmTransactionById: EvmTxDetailRow | null
        evmLogs: {id: string; logIndex: number; address: string; topics: string[]; data: string}[]
        tokenTransfers: TokenTransferRow[]
    }>(
        `query ($id: String!) {
            evmTransactionById(id: $id) { ${EVM_TX_FIELDS} extrinsic { transfers(orderBy: id_ASC) { ${TRANSFER_FIELDS} } } }
            evmLogs(where: {transaction: {id_eq: $id}}, orderBy: logIndex_ASC, limit: 100) { id logIndex address topics data }
            tokenTransfers(where: {transaction: {id_eq: $id}}, limit: 50) { ${TOKEN_TRANSFER_FIELDS} }
        }`,
        {id: hash}
    )
}

export function evmAddressData(address: string) {
    return gql<{
        txs: EvmTxRow[]
        holdings: {balance: string | null; token: TokenRow}[]
        created: {id: string}[]
        asToken: TokenRow | null
    }>(
        `query ($a: String!) {
            txs: evmTransactions(where: {OR: [{from_eq: $a}, {to_eq: $a}, {contractAddress_eq: $a}]}, orderBy: timestamp_DESC, limit: 25) { ${EVM_TX_FIELDS} }
            holdings: tokenHolders(where: {address_eq: $a}, orderBy: balance_DESC_NULLS_LAST, limit: 50) { balance token { ${TOKEN_FIELDS} } }
            created: evmTransactions(where: {contractAddress_eq: $a}, limit: 1) { id }
            asToken: tokenById(id: $a) { ${TOKEN_FIELDS} }
        }`,
        {a: address}
    )
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
 * One call out of a proposal, flattened in preorder. Depth is what reads the
 * list back as the tree the chain would run.
 */
export interface ProposalNode {
    pallet: string
    method: string
    depth: number
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
    proposalCalls: ProposalNode[] | null
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

const TRACK_FIELDS = `id name maxDeciding maxSpend decisionDeposit preparePeriod decisionPeriod confirmPeriod minEnactmentPeriod minApproval minSupport`
const REFERENDUM_FIELDS = `id index origin proposalHash title description proposalPallet proposalMethod proposalCalls proposalAmount proposalBeneficiary submittedAt submittedTimestamp status decidingSince confirmingSince endedAt ayes nays support timeline submitter { ${ACCOUNT_REF} } submissionDepositor submissionDeposit decisionDepositor decisionDeposit track { ${TRACK_FIELDS} }`

export interface TreasurySpendRow {
    id: string
    referendum: {index: number; status: string} | null
    kind: string
    amount: string
    status: string
    block: number
    beneficiary: AccountRef | null
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


export function bountyDetail(index: number) {
    return gql<{bounties: BountyRow[]; childBounties: ChildBountyRow[]}>(
        `query ($index: Int!) {
            bounties(where: {index_eq: $index}, limit: 1) { ${BOUNTY_FIELDS} }
            childBounties(where: {parent: {index_eq: $index}}, orderBy: childIndex_ASC, limit: 100) { id childIndex value fee description status payout updatedAt curator { ${ACCOUNT_REF} } beneficiary { ${ACCOUNT_REF} } }
        }`,
        {index}
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
        bounties: {totalCount: number}
        tracks: {totalCount: number}
        trackList: {id: string; name: string}[]
    }>(
        `query {
            dailyStats(orderBy: date_DESC, limit: 1) { issuanceTotal issuanceInactive treasuryPot }
            refs: referendumsConnection(orderBy: index_ASC) { totalCount }
            ongoing: referendumsConnection(orderBy: index_ASC, where: {status_eq: Ongoing}) { totalCount }
            spends: treasurySpendsConnection(orderBy: block_DESC) { totalCount }
            bounties: bountiesConnection(orderBy: index_ASC) { totalCount }
            tracks: tracksConnection(orderBy: id_ASC) { totalCount }
            trackList: tracks(orderBy: id_ASC) { id name }
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
    return facetPage<TreasurySpendRow>('treasurySpends', SPEND_FIELDS, 'block_DESC', limit, offset, facets, on)
}

export function bountiesPage(limit: number, offset: number, facets: Facets, on: Selected) {
    return facetPage<BountyRow>('bounties', `${BOUNTY_FIELDS} referendum { index status }`, 'index_DESC', limit, offset, facets, on)
}

export function tracksPage(limit: number, offset: number) {
    return gql<{tracks: TrackRow[]}>(
        `query ($limit: Int!, $offset: Int!) {
            tracks(orderBy: id_ASC, limit: $limit, offset: $offset) { ${TRACK_FIELDS} }
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

export interface VoteActionRow extends VoteShape {
    id: string
    method: string
    delegatedVotes: string
    block: number
    timestamp: string
    voter: AccountRef
}

export interface DelegationActionRow {
    id: string
    method: string
    balance: string
    conviction: string
    delegatedVotes: string
    block: number
    timestamp: string
    who: AccountRef
    target: AccountRef
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

export function referendumDetail(index: number) {
    const tally = (shape: string) => `votesConnection(where: {referendum: {index_eq: $index}, removed_eq: false, ${shape}}, orderBy: id_ASC) { totalCount }`
    return gql<{
        referendums: ReferendumRow[]
        votes: VoteRow[]
        voteActions: VoteActionRow[]
        metadataActions: MetadataActionRow[]
        snapshots: TallySnapshotRow[]
        dailyStats: {issuanceTotal: string; issuanceInactive: string}[]
        voteCount: {totalCount: number}
        ayeCount: {totalCount: number}
        nayCount: {totalCount: number}
        abstainCount: {totalCount: number}
        splitCount: {totalCount: number}
    }>(
        `query ($index: Int!) {
            referendums(where: {index_eq: $index}, limit: 1) { ${REFERENDUM_FIELDS} }
            votes(where: {referendum: {index_eq: $index}, removed_eq: false}, orderBy: balance_DESC_NULLS_LAST, limit: 200) { ${VOTE_FIELDS} voter { ${ACCOUNT_REF} } referendum { index } }
            voteActions(where: {referendum: {index_eq: $index}}, orderBy: [block_DESC, id_DESC], limit: 500) { id method kind aye conviction balance ayeAmount nayAmount abstainAmount delegatedVotes block timestamp voter { ${ACCOUNT_REF} } }
            metadataActions(where: {referendum: {index_eq: $index}}, orderBy: [block_DESC, id_DESC], limit: 200) { id method hash title description block timestamp }
            snapshots: referendumTallySnapshots(where: {referendum: {index_eq: $index}}, orderBy: block_ASC, limit: 5000) { block ayes nays support totalIssuance inactiveIssuance }
            dailyStats(orderBy: date_DESC, limit: 1) { issuanceTotal issuanceInactive }
            voteCount: votesConnection(where: {referendum: {index_eq: $index}, removed_eq: false}, orderBy: id_ASC) { totalCount }
            ayeCount: ${tally('kind_eq: "Standard", aye_eq: true')}
            nayCount: ${tally('kind_eq: "Standard", aye_eq: false')}
            abstainCount: ${tally('kind_eq: "SplitAbstain"')}
            splitCount: ${tally('kind_eq: "Split"')}
        }`,
        {index}
    )
}

export interface TimelineEventRow {
    id: string
    args: unknown
    extrinsic: {id: string; hash: string} | null
}

export function eventsByIds(ids: string[]): Promise<{events: TimelineEventRow[]}> {
    if (ids.length === 0) return Promise.resolve({events: []})
    return gql<{events: TimelineEventRow[]}>(`query ($ids: [String!]) { events(where: {id_in: $ids}, limit: 500) { id args extrinsic { id hash } } }`, {ids})
}

export function trackList() {
    return gql<{tracks: {id: string; name: string}[]}>(`query { tracks(orderBy: id_ASC) { id name } }`)
}

// track ids are the pallet class numbers, safe to splice into aliases
export async function delegationsInPage(id: string, tracks: string[], track: string, limit: number, offset: number) {
    const target = `target: {id_eq: $id}`
    const where = track ? `{${target}, track: {id_eq: "${track}"}}` : `{${target}}`
    const counts = tracks.map(t => `t${t}: delegationsConnection(where: {${target}, track: {id_eq: "${t}"}}, orderBy: id_ASC) { totalCount }`)
    const raw = await gql<{delegations: DelegationRow[]; conn: {totalCount: number}; all: {totalCount: number}} & Record<string, {totalCount: number}>>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
            delegations(where: ${where}, orderBy: balance_DESC, limit: $limit, offset: $offset) { id conviction balance block track { id name } who { ${ACCOUNT_REF} } }
            conn: delegationsConnection(where: ${where}, orderBy: id_ASC) { totalCount }
            all: delegationsConnection(where: {${target}}, orderBy: id_ASC) { totalCount }
            ${counts.join('\n            ')}
        }`,
        {id, limit, offset}
    )
    return {
        rows: raw.delegations,
        total: raw.conn.totalCount,
        all: raw.all.totalCount,
        perTrack: Object.fromEntries(tracks.map(t => [t, raw[`t${t}`].totalCount])),
    }
}

// delegated power follows the track, not the referendum, so one lookup covers
// every voter on this page, identities come later for the few rows on screen
export function delegationsFor(targets: string[], track: string) {
    const where = `where: {target: {id_in: $targets}, track: {id_eq: $track}}`
    return gql<{
        delegations: {id: string; conviction: string; balance: string; who: {id: string}; target: {id: string}}[]
        conn: {totalCount: number}
    }>(
        `query ($targets: [String!], $track: String!) {
            delegations(${where}, orderBy: balance_DESC, limit: 5000) { id conviction balance who { id } target { id } }
            conn: delegationsConnection(${where}, orderBy: id_ASC) { totalCount }
        }`,
        {targets, track}
    )
}

// a delegation action touches every referendum open on its track, the window
// clips the track log to this referendum's lifetime
export function delegationActionsFor(track: string, from: number, to: number | null) {
    const decl = to === null ? '($track: String!, $from: Int!)' : '($track: String!, $from: Int!, $to: Int!)'
    const where = `{track: {id_eq: $track}, block_gte: $from${to === null ? '' : ', block_lte: $to'}}`
    return gql<{delegationActions: DelegationActionRow[]}>(
        `query ${decl} {
            delegationActions(where: ${where}, orderBy: [block_DESC, id_DESC], limit: 500) { id method balance conviction delegatedVotes block timestamp who { ${ACCOUNT_REF} } target { ${ACCOUNT_REF} } }
        }`,
        to === null ? {track, from} : {track, from, to}
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
    lastActiveSession: number
    account: AccountRef
}

const VALIDATOR_FIELDS = `id active lockedAmount lockExpiry offlineSessions equivocations kicked firstSeenBlock lastActiveSession account { ${ACCOUNT_REF} }`

export function validatorsData() {
    return gql<{validators: ValidatorRow[]}>(`query { validators(orderBy: lastActiveSession_DESC, limit: 200) { ${VALIDATOR_FIELDS} } }`)
}

export interface MinerDayRow {
    day: string
    blocks: number
    rewards: string
    account: AccountRef
}

const MINER_DAY_PAGE = 5000

// a long window over many miners runs past any single page
export async function minerDays(sinceDay: string): Promise<MinerDayRow[]> {
    const rows: MinerDayRow[] = []
    for (let offset = 0; ; offset += MINER_DAY_PAGE) {
        const {minerDayStats} = await gql<{minerDayStats: MinerDayRow[]}>(
            `query ($since: String!, $limit: Int!, $offset: Int!) {
                minerDayStats(where: {day_gte: $since}, orderBy: id_ASC, limit: $limit, offset: $offset) { day blocks rewards account { ${ACCOUNT_REF} } }
            }`,
            {since: sinceDay, limit: MINER_DAY_PAGE, offset}
        )
        rows.push(...minerDayStats)
        if (minerDayStats.length < MINER_DAY_PAGE) return rows
    }
}

export function chartSeries(after: string, before: string) {
    const day = [after && `date_gte: "${after}T00:00:00.000Z"`, before && `date_lte: "${before}T00:00:00.000Z"`].filter(Boolean)
    return gql<{dailyStats: DailyRow[]}>(
        `query {
            dailyStats(${clause(day)}orderBy: date_ASC, limit: 4000) { ${DAILY_FIELDS} }
        }`
    )
}

export function searchLookups(hex66: string) {
    return gql<{byHash: {height: number}[]; ext: {id: string}[]; evm: {id: string}[]}>(
        `query ($h: String!) {
            byHash: blocks(where: {hash_eq: $h}, limit: 1) { height }
            ext: extrinsics(where: {hash_eq: $h}, limit: 1) { id }
            evm: evmTransactions(where: {id_eq: $h}, limit: 1) { id }
        }`,
        {h: hex66}
    )
}

export function isTokenAddress(address: string) {
    return gql<{tokens: {id: string}[]}>(`query ($a: String!) { tokens(where: {id_eq: $a}, limit: 1) { id } }`, {a: address}).then(r => r.tokens.length > 0)
}

export interface TokenHit {
    id: string
    name: string | null
    symbol: string | null
}

export function searchNames(q: string) {
    return gql<{accounts: {id: string; identityDisplay: string | null}[]; tokens: TokenHit[]}>(
        `query ($q: String!) {
            accounts(where: {OR: [{identityDisplay_containsInsensitive: $q}, {username_containsInsensitive: $q}]}, limit: 20) { ${ACCOUNT_REF} }
            tokens(where: {OR: [{symbol_containsInsensitive: $q}, {name_containsInsensitive: $q}]}, orderBy: transferCount_DESC, limit: 20) { id name symbol }
        }`,
        {q}
    )
}

export interface IndexerStatus {
    blocks: {height: number; timestamp: string}[]
    chainInfos: {head: number; blockTime: number}[]
}

export function indexerStatus() {
    return gql<IndexerStatus>(`query {
        blocks(orderBy: height_DESC, limit: 1) { height timestamp }
        chainInfos(limit: 1) { head blockTime }
    }`)
}
