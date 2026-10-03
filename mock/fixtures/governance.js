import {at, chainInfo, hashOf, HEAD, issuance, numn, paged, PEOPLE, person, squidId, SUBMISSION_DEPOSIT} from '../fixtures.js'

const heightOf = id => Number(id.split('-')[0])
const indexOf = id => Number(id.split('-').at(-1))
const newestFirst = (a, b) => heightOf(b.id) - heightOf(a.id) || indexOf(b.id) - indexOf(a.id)
const descending = key => (a, b) => (key(b) > key(a) ? 1 : key(b) < key(a) ? -1 : 0)

export const CHAIN = (({name, head, finalizedHead, ...rest}) => ({chain: name, ...rest}))(chainInfo)

const KNOWN = new Map(PEOPLE.map(p => [p.id, p]))

// an account with no identity whose id never repeats another one, for lists longer than PEOPLE
export const anon = n => ({id: '0x' + ('b' + n.toString(16).padStart(7, '0')).repeat(8)})

// an account lookup by id answers with the identity a person carries, any other account comes back bare
export const accounts = ({where}) => (where?.id_in ?? []).map(id => KNOWN.get(id) ?? {id})

// the facets a governance list filters on, kind and status sit on the row and track on its referendum
const FACETS = {
    kind_eq: (row, v) => row.kind === v,
    status_eq: (row, v) => row.status === v,
    referendum: (row, v) => row.referendum?.track?.id === v.track.id_eq,
}
const matches = (row, where = {}) => Object.entries(where).every(([field, v]) => FACETS[field]?.(row, v) ?? true)

// a list field answering each query with the page of rows its filters pick
export const listed = rows => args => paged(rows.filter(row => matches(row, args.where)))(args)

// a connection field counting the rows each query's filters pick
export const counted = rows => ({where}) => ({totalCount: rows.filter(row => matches(row, where)).length})

// the Treasury event a spend raised last, spend_local ends at Awarded and spend at SpendProcessed
const SPEND_KIND = {
    SpendApproved: 'spend_local',
    Awarded: 'spend_local',
    AssetSpendApproved: 'spend',
    Paid: 'spend',
    AssetSpendVoided: 'spend',
    PaymentFailed: 'spend',
    SpendProcessed: 'spend',
}
export const SPEND_STATUSES = Object.keys(SPEND_KIND)
const SPENDER_TRACKS = ['30', '31', '32']

// the indexer keys a spend_local by its proposal index and a spend by its own index
export const spend = (n, status, traits = {}) => ({
    id: `${SPEND_KIND[status] === 'spend_local' ? 'local' : 'spend'}-${n}`,
    kind: SPEND_KIND[status],
    status,
    amount: numn(1000 + ((n * 7919) % 90_000)),
    block: HEAD - 600 - n * 1440,
    beneficiary: person(n),
    referendum: {index: 100 + n, status: 'Approved', track: {id: SPENDER_TRACKS[n % 3]}},
    ...traits,
})

export const linear = (length, floor, ceil) => ({__kind: 'LinearDecreasing', length, floor, ceil})
export const reciprocal = (factor, xOffset, yOffset) => ({__kind: 'Reciprocal', factor, xOffset, yOffset})
export const stepped = (begin, end, step, period) => ({__kind: 'SteppedDecreasing', begin, end, step, period})

export const track = (id, name, traits = {}) => ({
    id,
    name,
    maxDeciding: 10,
    maxSpend: null,
    decisionDeposit: numn(1000),
    preparePeriod: 720,
    decisionPeriod: 241_920,
    confirmPeriod: 8640,
    minEnactmentPeriod: 60,
    minApproval: linear(1e9, 5e8, 1e9),
    minSupport: linear(1e9, 0, 5e8),
    ...traits,
})

const DAY = 8640

const OPENED = ['BountyProposed', 'BountyApproved', 'BountyBecameActive']
const HIRED = [...OPENED, 'CuratorProposed', 'CuratorAccepted']

// the events that walk a bounty to each status, approve_bounty_with_curator
// raises the approval and the curator proposal in one go
const BOUNTY_STEPS = {
    Proposed: ['BountyProposed'],
    Approved: ['BountyProposed', 'BountyApproved'],
    ApprovedWithCurator: ['BountyProposed', 'BountyApproved', 'CuratorProposed'],
    Funded: OPENED,
    CuratorProposed: [...OPENED, 'CuratorProposed'],
    Active: [...HIRED, 'BountyExtended'],
    PendingPayout: [...HIRED, 'BountyAwarded'],
    BountyClaimed: [...HIRED, 'BountyAwarded', 'BountyClaimed'],
    BountyRejected: ['BountyProposed', 'BountyRejected'],
    BountyCanceled: [...HIRED, 'CuratorUnassigned', 'BountyCanceled'],
}
export const BOUNTY_STATUSES = Object.keys(BOUNTY_STEPS)

const CURATED = new Set(['ApprovedWithCurator', 'CuratorProposed', 'Active', 'PendingPayout', 'BountyClaimed'])
const AWARDED = new Set(['PendingPayout', 'BountyClaimed'])
// the bounty events an account signs for, the rest come from a referendum or the spend period
const SIGNED_BOUNTY = new Set(['BountyProposed', 'CuratorAccepted', 'BountyAwarded', 'BountyClaimed', 'BountyExtended', 'CuratorUnassigned'])
const VOTED_ON = {Proposed: 'Ongoing', BountyRejected: 'Rejected'}

const TOPICS = [
    'Audit the PoScan verifier and publish the report',
    'Port the wallet to iOS and Android',
    'Translate the docs into Spanish and Portuguese',
    'Run a public testnet faucet for a year',
    'Fuzz the spectral3d mesh parser',
    'Build a block explorer API with rate limits',
    'Write a hardware wallet integration',
]

export function bounty(index, status, traits = {}) {
    const created = HEAD - 120_000 - index * 2_000
    const names = BOUNTY_STEPS[status]
    const timeline = names.map((name, k) => {
        const block = created + (name === 'CuratorProposed' && names[k - 1] === 'BountyApproved' ? k - 1 : k) * 1.5 * DAY
        return {event: squidId(block, 2 + k), name: `Bounties.${name}`, block, timestamp: at(block)}
    })
    const value = numn(20_000 + index * 2_500)
    const fee = CURATED.has(status) ? numn(400 + index * 50) : '0'
    return {
        id: String(index),
        index,
        value,
        fee,
        description: TOPICS[index % TOPICS.length],
        status,
        unlockAt: status === 'PendingPayout' ? HEAD + 3 * DAY : null,
        updateDue: status === 'Active' ? HEAD + 30 * DAY : null,
        payout: status === 'BountyClaimed' ? (BigInt(value) - BigInt(fee)).toString() : null,
        createdAt: created,
        updatedAt: timeline.at(-1).block,
        timeline,
        proposer: person(index),
        curator: CURATED.has(status) ? person(index + 3) : null,
        beneficiary: AWARDED.has(status) ? person(index + 5) : null,
        referendum: {index: 200 + index, status: VOTED_ON[status] ?? 'Approved', track: {id: SPENDER_TRACKS[index % 3]}},
        ...traits,
    }
}

// the events a bounty timeline names, a signed step carries its extrinsic
export const bountyEvents = b =>
    b.timeline.map((s, k) => ({
        id: s.event,
        indexInBlock: indexOf(s.event),
        args: null,
        extrinsic: SIGNED_BOUNTY.has(s.name.split('.')[1]) ? {id: squidId(s.block, 1 + k)} : null,
    }))

export const CHILD_STATUSES = ['Added', 'CuratorProposed', 'Active', 'PendingPayout', 'Claimed', 'Canceled']
const CHILD_CURATED = new Set(['CuratorProposed', 'Active', 'PendingPayout', 'Claimed'])

export function childBounty(parent, childIndex, status, traits = {}) {
    const value = numn(1_000 + childIndex * 750)
    const fee = CHILD_CURATED.has(status) ? numn(50 + childIndex * 5) : '0'
    return {
        id: `${parent}-${childIndex}`,
        childIndex,
        value,
        fee,
        description: `Milestone ${childIndex + 1} of the parent bounty`,
        status,
        payout: status === 'Claimed' ? (BigInt(value) - BigInt(fee)).toString() : null,
        updatedAt: HEAD - 5_000 - childIndex * 700,
        curator: CHILD_CURATED.has(status) ? person(childIndex + 2) : null,
        beneficiary: status === 'PendingPayout' || status === 'Claimed' ? person(childIndex + 6) : null,
        ...traits,
    }
}

// the same shape mock/data.js gives a referendum step
export const step = (name, block, index) => ({name, block, event: `${String(block).padStart(10, '0')}-00000-${String(index).padStart(6, '0')}`, timestamp: at(block)})

// tally rows are [block, ayes, nays, support] in whole NUMN, the way mock/data.js writes a history
export const snapshots = history =>
    history.map(([block, ayes, nays, support]) => ({
        block,
        ayes: numn(ayes),
        nays: numn(nays),
        support: numn(support),
        totalIssuance: issuance.issuanceTotal,
        inactiveIssuance: issuance.issuanceInactive,
    }))

const SIGNED_STEP = new Set(['Submitted', 'DecisionDepositPlaced', 'SubmissionDepositRefunded', 'DecisionDepositRefunded'])
const TALLIED = new Set(['Confirmed', 'Rejected', 'TimedOut', 'Cancelled', 'Killed'])

const tallyAt = (r, block) => {
    const s = r.snapshots.filter(x => x.block <= block).at(-1)
    return {ayes: s?.ayes ?? '0', nays: s?.nays ?? '0', support: s?.support ?? '0'}
}

// a kill slashes the submission deposit first and the decision deposit after it
function stepArgs(r, method, s, slash) {
    const index = r.index
    const proposal = {__kind: 'Lookup', hash: r.proposalHash, len: 41}
    const decider = r.decisionDepositor ?? person(index + 1).id
    switch (method) {
        case 'Submitted':
            return {index, track: Number(r.track.id), proposal}
        case 'DecisionStarted':
            return {index, track: Number(r.track.id), proposal, tally: tallyAt(r, s.block)}
        case 'DecisionDepositPlaced':
        case 'DecisionDepositRefunded':
            return {index, who: decider, amount: r.track.decisionDeposit}
        case 'SubmissionDepositRefunded':
            return {index, who: r.submitter.id, amount: SUBMISSION_DEPOSIT}
        case 'DepositSlashed':
            return slash === 0 ? {who: r.submitter.id, amount: SUBMISSION_DEPOSIT} : {who: decider, amount: r.track.decisionDeposit}
        case 'Dispatched':
            return {task: [s.block, 0], id: hashOf('task', index), result: {__kind: 'Ok'}}
        default:
            return TALLIED.has(method) ? {index, tally: tallyAt(r, s.block)} : {index}
    }
}

// the events a referendum timeline names, with what each carried. a decision
// that starts inside place_decision_deposit shares that extrinsic
export function stepEvents(r) {
    const placed = new Map(r.timeline.filter(s => s.name === 'Referenda.DecisionDepositPlaced').map(s => [s.block, s]))
    let slashes = 0
    return r.timeline.map(s => {
        const method = s.name.split('.')[1]
        const host = method === 'DecisionStarted' ? placed.get(s.block) : SIGNED_STEP.has(method) ? s : undefined
        return {
            id: s.event,
            indexInBlock: indexOf(s.event),
            args: stepArgs(r, method, s, method === 'DepositSlashed' ? slashes++ : 0),
            extrinsic: host ? {id: squidId(host.block, 1 + r.timeline.indexOf(host))} : null,
        }
    })
}

// a cleared row carries no text, a set row whose preimage is missing carries none either
export const metadataAction = (block, index, method, text = {}) => ({
    id: squidId(block, index),
    method,
    hash: text.hash ?? hashOf('preimage', block),
    title: text.title ?? null,
    description: text.description ?? null,
    block,
    timestamp: at(block),
})

export const metadataEvents = actions => actions.map(a => ({id: a.id, indexInBlock: indexOf(a.id), args: {hash: a.hash}, extrinsic: {id: squidId(a.block, 1)}}))

// events looked up by id come back newest first, the way the query orders them
export const eventsById = (...lists) => {
    const byId = new Map(lists.flat().map(e => [e.id, e]))
    return ({where}) => (where?.id_in ?? []).flatMap(id => byId.get(id) ?? []).sort(newestFirst)
}

// what the indexer derives from a proposal call tree, the total over its
// spends and the payee when every spend pays the same one
export function proposal(nodes, args) {
    const spends = nodes.filter(n => n.amount != null)
    const payees = new Set(spends.map(n => n.beneficiary))
    return {
        proposalPallet: nodes[0].pallet,
        proposalMethod: nodes[0].method,
        proposalArgs: args,
        proposalCalls: nodes,
        proposalAmount: spends.length > 0 ? spends.reduce((sum, n) => sum + BigInt(n.amount), 0n).toString() : null,
        proposalBeneficiary: payees.size === 1 ? spends[0].beneficiary : null,
    }
}

const NO_VOTE = {aye: null, conviction: null, balance: null, ayeAmount: null, nayAmount: null, abstainAmount: null}

export const standard = (voter, aye, conviction, balance) => ({...NO_VOTE, kind: 'Standard', aye, conviction, balance, voter})
export const split = (voter, ayeAmount, nayAmount) => ({...NO_VOTE, kind: 'Split', ayeAmount, nayAmount, voter})
export const splitAbstain = (voter, ayeAmount, nayAmount, abstainAmount) => ({...NO_VOTE, kind: 'SplitAbstain', ayeAmount, nayAmount, abstainAmount, voter})

// a vote list asks for one kind of vote and, for a standard one, one side
const inList = where => v => (where?.kind_eq == null || v.kind === where.kind_eq) && (where?.aye_eq == null || v.aye === where.aye_eq)

// the amounts each kind's list is ordered by, biggest first, ties by id
const LEAD = {Standard: ['balance'], Split: ['ayeAmount', 'nayAmount'], SplitAbstain: ['abstainAmount', 'ayeAmount', 'nayAmount']}
const byLead = kind => (a, b) => {
    for (const f of LEAD[kind]) if (a[f] !== b[f]) return BigInt(b[f]) > BigInt(a[f]) ? 1 : -1
    return a.id < b.id ? -1 : 1
}

// the standing votes on a referendum, each list a page at a time in its own
// order, with the counts the tally card and the vote chips read
export function voteData(index, cast) {
    const votes = cast.map(v => ({id: `${index}-${v.voter.id}`, referendum: {index}, block: HEAD - 100, removed: false, ...v}))
    return {
        votes: ({where, ...page}) => paged(votes.filter(inList(where)).sort(byLead(where.kind_eq)))(page),
        votesConnection: ({where}) => ({totalCount: votes.filter(inList(where)).length}),
    }
}

// one row per Voted or VoteRemoved event, delegatedVotes is what the voter's casting record held then
export const voteAction = (block, index, method, vote, delegatedVotes = '0') => ({
    id: squidId(block, index),
    method,
    ...vote,
    delegatedVotes,
    block,
    timestamp: at(block),
})

const voteLog = (index, cast) => ({...voteData(index, cast), voteActions: cast.map((v, k) => voteAction(v.block, 20 + k, 'Voted', v)).sort(newestFirst)})

// one Locked1x vote per tally move, so the vote lists, the action log and the
// curve steps all read back the history mock/data.js wrote
export function castFromSnapshots(r) {
    const cast = []
    let ayes = 0n
    let nays = 0n
    for (const s of r.snapshots) {
        for (const [aye, moved] of [[true, BigInt(s.ayes) - ayes], [false, BigInt(s.nays) - nays]]) {
            if (moved > 0n) cast.push({...standard(person(r.index + cast.length), aye, 'Locked1x', moved.toString()), block: s.block})
        }
        ayes = BigInt(s.ayes)
        nays = BigInt(s.nays)
    }
    return voteLog(r.index, cast)
}

// None counts a tenth of the balance and LockedNx counts it N times over
const weigh = (balance, conviction) => (conviction === 'None' ? BigInt(balance) / 10n : BigInt(balance) * BigInt(conviction.slice(6, -1)))

// a split counts every part at a tenth, delegations only ride along a
// standard vote at their own conviction and an aye adds its capital to support
function count(t, v, delegated) {
    if (v.kind !== 'Standard') {
        const support = t.support + BigInt(v.ayeAmount) + BigInt(v.abstainAmount ?? 0)
        return {ayes: t.ayes + BigInt(v.ayeAmount) / 10n, nays: t.nays + BigInt(v.nayAmount) / 10n, support}
    }
    const mine = delegated.filter(d => d.target.id === v.voter.id)
    const votes = mine.reduce((n, d) => n + weigh(d.balance, d.conviction), weigh(v.balance, v.conviction))
    const capital = mine.reduce((n, d) => n + BigInt(d.balance), BigInt(v.balance))
    return v.aye ? {...t, ayes: t.ayes + votes, support: t.support + capital} : {...t, nays: t.nays + votes}
}

// a referendum whose tally and snapshots add up the votes cast on it and the
// delegations behind them block by block, next to the vote rows, counts and
// log those votes leave
export function castVotes(r, cast, delegated = []) {
    let t = {ayes: 0n, nays: 0n, support: 0n}
    const history = [...new Set(cast.map(v => v.block))]
        .sort((a, b) => a - b)
        .map(block => {
            for (const v of cast) if (v.block === block) t = count(t, v, delegated)
            return {block, ayes: String(t.ayes), nays: String(t.nays), support: String(t.support), totalIssuance: issuance.issuanceTotal, inactiveIssuance: issuance.issuanceInactive}
        })
    return {referendum: {...r, ayes: String(t.ayes), nays: String(t.nays), support: String(t.support), snapshots: history}, ...voteLog(r.index, cast)}
}

export const delegation = (who, target, conviction, balance, track) => ({id: `${who.id}-${track}`, conviction, balance, block: HEAD - 50_000, who, target})

// the delegations to a page's voters on one track, biggest first, total counts what one page could not hold
export const delegationData = (list, total = list.length) => ({
    delegations: [...list].sort(descending(d => BigInt(d.balance))),
    delegationsConnection: {totalCount: total},
})

// delegatedVotes is the weight the target holds from delegations after this action
export const delegationAction = (block, index, method, who, target, conviction, balance, delegatedVotes) => ({
    id: squidId(block, index),
    method,
    balance,
    conviction,
    delegatedVotes,
    block,
    timestamp: at(block),
    who,
    target,
})
