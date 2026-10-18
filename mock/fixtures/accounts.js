import data from '../data.js'
import {account, acct, at, base, block, chainInfo, HEAD, HEAD_TIME, hashOf, hex, identity, numn, paged, PEOPLE, person, rows, squidId, subData, subOf, transfer} from '../fixtures.js'

// the account every account page story is about, and the H160 it maps from
export const SUBJECT = account(77)
export const SUBJECT_EVM = '0x7e57a11ce0000000000000000000000000c0ffee'
export const ME = {id: SUBJECT, identityDisplay: null}

export const TREASURY = {id: chainInfo.treasuryAccount, identityDisplay: null}
export const PRIME_KEY = acct(90, identity('Numen Prime Council', {judgements: ['KnownGood']}))

// the chain row the way chainProps() hands it to components
export const CHAIN = (({name, head, finalizedHead, ...rest}) => ({chain: name, ...rest}))(chainInfo)

export const MAX_U128 = ((1n << 128n) - 1n).toString()
export const PLANCK = '1'

const sum = amounts => amounts.reduce((n, a) => n + BigInt(a), 0n).toString()

// balance is free plus reserved, the way the indexer writes it
export const funds = (free, reserved = '0', frozen = '0') => ({free, reserved, frozen, balance: sum([free, reserved])})

export const reservedOf = (...amounts) => sum(amounts)

export const subject = (traits = {}) => ({
    id: SUBJECT,
    ...funds(numn(1250.5)),
    nonce: 37,
    firstSeenBlock: 412_345,
    firstSeenTimestamp: at(412_345),
    lastActiveBlock: HEAD - 1_200,
    identityDisplay: null,
    identityJson: null,
    identitySubName: null,
    identitySubData: null,
    identitySuper: null,
    evmAddress: null,
    vestingJson: null,
    locksJson: null,
    holdsJson: null,
    depositsJson: null,
    ...traits,
})

// a sub entry as the account page reads it, the super carries its id
export function subUnder(parent, name) {
    const sub = subOf(parent, name)
    return {...sub, identitySuper: {id: parent.id, ...sub.identitySuper}}
}

export const VERDICTS = ['KnownGood', 'Reasonable', 'OutOfDate', 'FeePaid', 'Unknown', 'LowQuality', 'Erroneous']

// every field the runtime IdentityInfo carries, the long ones near their byte caps
export const FULL_FIELDS = {
    judgements: ['KnownGood'],
    avatar: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    bio: 'Independent PoScan mining collective running scanners on three continents since genesis, with operators on call around the clock',
    web: 'aurora-labs.example/about/the-operators-behind-the-collective',
    email: 'operators@aurora-labs.example',
    github: 'aurora-labs',
    matrix: '@aurora:matrix.org',
    x: '@aurora_labs',
    telegram: '@auroralabs',
    discord: 'auroralabs',
}

const registrarRow = (index, acc, traits = {}) => ({
    id: String(index),
    index,
    fee: numn(10 + index),
    addedAt: index === 0 ? null : 200_000 + index * 1_000,
    retiredAt: null,
    requestCount: 120 - index * 7,
    givenCount: 110 - index * 7,
    lastJudgementBlock: HEAD - index * 900,
    lastJudgementAt: at(HEAD - index * 900),
    account: acc,
    ...traits,
})

// one seat per verdict an identity can carry, seat 3 retired
const REGISTRARS = [
    registrarRow(0, PEOPLE[0]),
    registrarRow(1, PEOPLE[1]),
    registrarRow(2, PEOPLE[5]),
    registrarRow(3, null, {fee: null, retiredAt: 640_000, retiredTimestamp: at(640_000)}),
    registrarRow(4, PEOPLE[2]),
    registrarRow(5, PEOPLE[3]),
    registrarRow(6, PEOPLE[9]),
]

export const RETIRED = REGISTRARS.filter(r => r.retiredAt != null).map(r => ({index: r.index}))

export const TRACKS = data.tracks.map(({id, name}) => ({id, name}))
export const CONVICTIONS = ['None', 'Locked1x', 'Locked2x', 'Locked3x', 'Locked4x', 'Locked5x', 'Locked6x']

// transfers an ordinary list never reaches, starting at height and going back one block each
export const transferCases = (height = HEAD - 3) => [
    transfer(height, 0, {from: TREASURY, extrinsic: null, call: null, amount: numn(120_000)}),
    transfer(height - 1, 2, {call: {pallet: 'Ethereum', method: 'transact'}}),
    transfer(height - 2, 4, {call: {pallet: 'Vesting', method: 'vested_transfer'}, amount: numn(250_000)}),
    transfer(height - 3, 1, {call: {pallet: 'Balances', method: 'transfer_all'}, from: PEOPLE[7], to: PEOPLE[8]}),
    transfer(height - 4, 3, {amount: PLANCK}),
    transfer(height - 5, 5, {amount: MAX_U128}),
]

// the subject sends every third transfer and receives the rest, or takes the side asked for
export const accountTransfers = (count, side) => rows(count, (h, i) => transfer(h, i, {[side ?? (i % 3 === 0 ? 'from' : 'to')]: ME}))

export const accountTransferCases = height => transferCases(height).map((t, i) => ({...t, ...(i === 1 || i === 4 ? {from: ME} : {to: ME})}))

const accountExtrinsic = (h, i, traits = {}) => ({
    id: squidId(h, i),
    block: {height: h, timestamp: at(h)},
    indexInBlock: i,
    hash: hashOf('extrinsic', h, i),
    pallet: 'Balances',
    method: 'transfer_keep_alive',
    leafCalls: null,
    signer: ME,
    success: true,
    error: null,
    fee: numn(0.0105),
    tip: '0',
    minerFee: numn(0.0021),
    treasuryFee: numn(0.0084),
    ...traits,
})

const CALLS = [
    ['Balances', 'transfer_keep_alive'],
    ['ConvictionVoting', 'vote'],
    ['Utility', 'batch_all'],
    ['Identity', 'set_identity'],
    ['Proxy', 'proxy'],
    ['Ethereum', 'transact'],
    ['Multisig', 'as_multi'],
]

const FAILED = {__kind: 'Module', value: {index: 10, error: '0x02000000'}}

// what a wrapper ran, counted by name the way the indexer writes it for the list to print under the call
const LEAVES = {
    batch_all: [{pallet: 'Balances', method: 'transfer_keep_alive', count: 3}, {pallet: 'Identity', method: 'set_identity', count: 1}],
    proxy: [{pallet: 'ConvictionVoting', method: 'vote', count: 1}],
}

export const accountExtrinsics = count =>
    rows(count, (h, i) => {
        const [pallet, method] = CALLS[i % CALLS.length]
        return accountExtrinsic(h, i % 4, {pallet, method, leafCalls: LEAVES[method] ?? null, success: i % 5 !== 3, error: i % 5 === 3 ? FAILED : null})
    })

// votes is what the index stores beside the balance, a tenth of it for None and N times it for LockedNx
const weighed = d => ({...d, votes: (d.conviction === 'None' ? BigInt(d.balance) / 10n : BigInt(d.balance) * BigInt(d.conviction.slice(6, -1))).toString()})

const delegation = (i, traits = {}) =>
    weighed({
        id: `delegation-${i}`,
        conviction: CONVICTIONS[i % CONVICTIONS.length],
        balance: numn(1_000 * (i + 1) + 0.25 * i),
        block: HEAD - 1_000 * (i + 1),
        track: TRACKS[i % TRACKS.length],
        ...traits,
    })

export const delegatingTo = count => Array.from({length: count}, (_, i) => delegation(i, {target: person(i)}))

// the incoming list is ordered by balance, biggest first
export const delegatedFrom = (count, tracks = TRACKS) =>
    Array.from({length: count}, (_, i) => delegation(i + 100, {who: person(i + 1), track: tracks[i % tracks.length], balance: numn(500 * (count - i) + 0.5)}))

// one account delegating the same balance on each track given, which the incoming list keeps in track order
export const delegatedOnTracks = (who, tracks, balance) => tracks.map((track, i) => delegation(i + 200, {who, track, balance, conviction: 'Locked3x', block: HEAD - 2_000}))

const PROXY_TYPES = ['Any', 'Governance', 'NonTransfer']

const proxy = (i, traits = {}) => ({id: `proxy-${i}`, proxyType: PROXY_TYPES[i % PROXY_TYPES.length], delay: [0, 100, 14_400][Math.floor(i / 3) % 3], ...traits})

// accounts that may act for the subject, and accounts the subject may act for
export const proxyDelegates = count => Array.from({length: count}, (_, i) => proxy(i, {delegatee: person(i)}))
export const proxyFor = count => Array.from({length: count}, (_, i) => proxy(i + 50, {delegator: person(i + 3)}))

// one delegate of one type held several times over, apart only in the delay, shortest first
export const proxyDelays = (delegatee, proxyType, delays) => delays.map((delay, i) => proxy(i, {delegatee, proxyType, delay}))

export const multisigOp = (i, traits = {}) => ({
    id: `multisig-${i}`,
    callHash: hashOf('call', i),
    approvals: [account(1), account(2)],
    threshold: 2,
    signatories: null,
    status: 'MultisigExecuted',
    result: {__kind: 'Ok'},
    deposit: numn(20.088),
    createdBlock: HEAD - 4_000 - i * 700,
    updatedBlock: HEAD - 3_000 - i * 700,
    multisig: person(i + 2),
    depositor: ME,
    ...traits,
})

// every way an operation can stand, the open ones first
export const MULTISIG_ENDS = [
    {status: 'NewMultisig', approvals: [SUBJECT], result: null},
    {status: 'MultisigApproval', approvals: [SUBJECT, account(1)], threshold: 3, result: null},
    {status: 'MultisigExecuted', result: {__kind: 'Ok'}},
    {status: 'MultisigExecuted', result: {__kind: 'Err', value: FAILED}},
    {status: 'MultisigCancelled', approvals: [account(1)], result: null},
    {status: 'NewMultisig', approvals: [account(3)], threshold: null, result: null, depositor: person(2)},
]

export const multisigOps = () => MULTISIG_ENDS.map((end, i) => multisigOp(i, end))

export const SIGNATORIES = [account(1), account(2), account(4), account(5), account(6)]

export const vote = (i, traits = {}) => ({
    id: `vote-${i}`,
    kind: 'Standard',
    aye: true,
    conviction: 'Locked1x',
    balance: numn(1_000 + i * 250),
    ayeAmount: null,
    nayAmount: null,
    abstainAmount: null,
    block: HEAD - 500 * (i + 1),
    removed: false,
    lockedUntil: null,
    unlockedAt: null,
    referendum: poll(6, 'Ongoing', null),
    ...traits,
})

export function poll(index, status, endedAt, traits = {}) {
    return {index, title: `Referendum ${index} title`, status, decidingSince: status === 'Ongoing' ? HEAD - 20_000 : null, confirmingSince: null, endedAt, ...traits}
}

// one row per way a vote list files a vote and frees its balance, the won 3x
// and 6x votes still locked past their end, the removed one freed by an unlock
const VOTE_CASES = [
    {aye: true, conviction: 'Locked1x', referendum: poll(6, 'Ongoing', null, {title: 'Fund the Q4 explorer roadmap'})},
    {kind: 'Split', aye: null, conviction: null, balance: null, ayeAmount: numn(4_000), nayAmount: numn(1_500), referendum: poll(9, 'Ongoing', null, {confirmingSince: HEAD - 2_000})},
    {aye: true, conviction: 'Locked3x', lockedUntil: 940_560, referendum: poll(10, 'Approved', 698_640)},
    {aye: false, conviction: 'Locked6x', balance: numn(250_000), lockedUntil: 2_478_720, referendum: poll(1, 'Rejected', 543_360, {title: 'Treasury spend for community events across Asia, Europe and the Americas'})},
    {aye: false, conviction: 'None', lockedUntil: 588_640, referendum: poll(0, 'Approved', 588_640)},
    {kind: 'SplitAbstain', aye: null, conviction: null, balance: null, ayeAmount: numn(100), nayAmount: numn(100), abstainAmount: numn(9_800), lockedUntil: 520_960, referendum: poll(11, 'TimedOut', 520_960)},
    {aye: false, conviction: 'Locked2x', lockedUntil: 652_000, referendum: poll(2, 'Cancelled', 652_000, {title: null})},
    {aye: true, conviction: 'Locked4x', lockedUntil: 820_960, referendum: poll(3, 'TimedOut', 820_960)},
    {aye: false, conviction: 'Locked5x', lockedUntil: 790_000, referendum: poll(4, 'Killed', 790_000)},
    {aye: true, conviction: 'Locked1x', removed: true, lockedUntil: HEAD - 5_000, unlockedAt: HEAD - 4_000, referendum: poll(8, 'Ongoing', null, {decidingSince: null})},
]

export const voteRows = () => VOTE_CASES.map((c, i) => vote(i, c))

// a delegation a referendum counts through the account's standard vote there
export const delegatedVote = (index, conviction, units, from = person(1)) => ({conviction, balance: numn(units), voter: {id: SUBJECT}, delegator: {id: from.id}, referendum: {index}})

// a vote the account cast or took off, newest first. delegatedVotes is what its
// casting record held as the block ended
export const voteAction = (i, traits = {}) => {
    const h = HEAD - 300 * (i + 1)
    return {
        id: `6-${squidId(h, 3)}`,
        method: 'Voted',
        kind: 'Standard',
        aye: true,
        conviction: 'Locked1x',
        balance: numn(1_000 + i * 250),
        ayeAmount: null,
        nayAmount: null,
        abstainAmount: null,
        delegatedVotes: '0',
        block: h,
        indexInBlock: 3,
        timestamp: at(h),
        referendum: {index: 6},
        ...traits,
    }
}

// one row per decision, each conviction label, a removal and a vote carrying delegations
const VOTE_ACTION_CASES = [
    {conviction: 'Locked1x', delegatedVotes: numn(4_500)},
    {method: 'VoteRemoved', aye: false, conviction: 'Locked3x', referendum: {index: 9}},
    {aye: false, conviction: 'Locked3x', referendum: {index: 9}},
    {kind: 'Split', aye: null, conviction: null, balance: null, ayeAmount: numn(4_000), nayAmount: numn(1_500), referendum: {index: 10}},
    {kind: 'SplitAbstain', aye: null, conviction: null, balance: null, ayeAmount: numn(100), nayAmount: numn(100), abstainAmount: numn(9_800), referendum: {index: 11}},
    {conviction: 'None', referendum: {index: 0}},
    {conviction: 'Locked6x', balance: numn(250_000), referendum: {index: 1}},
]

export const voteActionRows = () => VOTE_ACTION_CASES.map((c, i) => voteAction(i, c))

// a delegation the account set up or ended, or one somebody else pointed at it
export const delegationAction = (i, traits = {}) => {
    const h = HEAD - 400 * (i + 1)
    return {
        id: squidId(h, 2),
        method: 'Delegated',
        conviction: CONVICTIONS[i % CONVICTIONS.length],
        balance: numn(1_000 * (i + 1) + 0.25 * i),
        block: h,
        indexInBlock: 2,
        timestamp: at(h),
        track: TRACKS[i % TRACKS.length],
        who: ME,
        target: person(i),
        ...traits,
    }
}

// both directions and both methods, plus a delegation its own block undid, which leaves no amount
const DELEGATION_ACTION_CASES = [
    {who: person(3), target: ME},
    {method: 'Undelegated', target: person(5)},
    {method: 'Undelegated', who: person(4), target: ME},
    {target: person(5)},
    {who: person(4), target: ME, conviction: null, balance: null},
]

export const delegationActionRows = () => DELEGATION_ACTION_CASES.map((c, i) => delegationAction(i, c))

export const delegationActionsOf = (count, side) =>
    Array.from({length: count}, (_, i) => delegationAction(i, side === 'out' ? {target: person(i)} : {who: person(i), target: ME}))

const judgement = (i, traits = {}) => {
    const h = HEAD - 2_000 * (i + 1)
    return {id: squidId(h, i % 5), kind: 'Reasonable', fee: null, block: h, timestamp: at(h), target: person(i), ...traits}
}

// what a registrar can hand out, and the verdict lost to a clear in the same block
export const JUDGEMENT_KINDS = ['KnownGood', 'Reasonable', 'OutOfDate', 'Unknown', 'LowQuality', 'Erroneous', null]

export const judgementsGiven = count => Array.from({length: count}, (_, i) => judgement(i, {kind: JUDGEMENT_KINDS[i % JUDGEMENT_KINDS.length]}))

// the last name fills all 32 bytes a Raw sub name can hold
const SUB_NAMES = ['payouts', 'treasury-ops', 'cold-storage', 'validator-payouts-europe-west-01']

// names in the order the query sorts them, the sub filed under a hash has no name and comes last
export const subRows = count => {
    const named = Array.from({length: Math.max(1, count - 1)}, (_, i) => SUB_NAMES[i] ?? `node-${String(i).padStart(2, '0')}`).sort()
    return [...named, null].slice(0, count).map((name, i) => ({id: account(300 + i), identitySubName: name, identitySubData: name == null ? {__kind: 'BlakeTwo256', value: hashOf('sub', 1)} : subData(name)}))
}

const identityInfo = fields => Object.fromEntries(['display', 'avatar', 'bio', 'web', 'email', 'github', 'matrix', 'x', 'telegram', 'discord'].map(k => [k, hex(fields[k] ?? '')]))

const step = (h, index, method, args, call = null, signed = true) => ({
    id: squidId(h, index),
    indexInBlock: index,
    method,
    args,
    block: {height: h, timestamp: at(h)},
    call,
    extrinsic: signed ? {id: squidId(h, 1)} : null,
})

export const identitySet = h =>
    step(h, 3, 'IdentitySet', {who: SUBJECT}, {method: 'set_identity', args: {info: identityInfo({display: 'Aurora Labs', web: 'aurora.example', x: '@aurora_labs', discord: 'auroralabs'})}})

const subId = n => ({__kind: 'Id', value: account(n)})

// every event the identity pallet raises about an account, newest first
export const identityTimeline = () => [
    step(HEAD - 100, 4, 'JudgementGiven', {target: SUBJECT, registrarIndex: 0}, {method: 'provide_judgement', args: {regIndex: 0, judgement: {__kind: 'Reasonable'}}}),
    step(HEAD - 400, 2, 'JudgementRequested', {who: SUBJECT, registrarIndex: 0}, {method: 'request_judgement', args: {regIndex: 0, maxFee: numn(10)}}),
    step(HEAD - 900, 6, 'SubIdentitiesSet', {main: SUBJECT, numberOfSubs: 2, newDeposit: numn(4.02)}, {
        method: 'set_subs',
        args: {subs: [[account(300), {__kind: 'Raw7', value: hex('payouts')}], [account(301), {__kind: 'BlakeTwo256', value: hashOf('sub', 1)}]]},
    }),
    step(HEAD - 1_500, 2, 'SubIdentityRenamed', {sub: account(300), main: SUBJECT}, {method: 'rename_sub', args: {sub: subId(300), data: {__kind: 'Raw7', value: hex('payouts')}}}),
    step(HEAD - 2_000, 5, 'SubIdentityAdded', {sub: account(300), main: SUBJECT, deposit: numn(2.01)}, {method: 'add_sub', args: {sub: subId(300), data: {__kind: 'Raw6', value: hex('payout')}}}),
    step(HEAD - 2_600, 1, 'SubIdentityRemoved', {sub: account(302), main: SUBJECT, deposit: numn(2.01)}, {method: 'remove_sub', args: {sub: subId(302)}}),
    step(HEAD - 3_100, 3, 'SubIdentityRevoked', {sub: SUBJECT, main: account(1), deposit: numn(2.01)}, {method: 'quit_sub', args: {}}),
    step(HEAD - 3_500, 2, 'PrimaryUsernameSet', {who: SUBJECT, username: hex('aurora.numen')}, {method: 'set_primary_username', args: {username: hex('aurora.numen')}}),
    step(HEAD - 3_600, 4, 'UsernameSet', {who: SUBJECT, username: hex('aurora.numen')}, null, false),
    step(HEAD - 4_000, 7, 'DanglingUsernameRemoved', {who: SUBJECT, username: hex('old-aurora.numen')}, {method: 'remove_dangling_username', args: {username: hex('old-aurora.numen')}}),
    step(HEAD - 5_000, 2, 'JudgementGiven', {target: SUBJECT, registrarIndex: 5}, {method: 'provide_judgement', args: {regIndex: 5, judgement: {__kind: 'Erroneous'}}}),
    step(HEAD - 5_400, 2, 'JudgementGiven', {target: SUBJECT, registrarIndex: 1}, {method: 'provide_judgement', args: {regIndex: 1, judgement: {__kind: 'KnownGood'}}}),
    step(HEAD - 6_000, 3, 'JudgementUnrequested', {who: SUBJECT, registrarIndex: 3}, {method: 'cancel_request', args: {regIndex: 3}}),
    step(HEAD - 7_000, 2, 'JudgementRequested', {who: SUBJECT, registrarIndex: 3}, {method: 'request_judgement', args: {regIndex: 3, maxFee: numn(5)}}),
    step(HEAD - 8_000, 2, 'IdentityKilled', {who: SUBJECT, deposit: numn(5.41)}, null, false),
    step(HEAD - 9_000, 3, 'IdentityCleared', {who: SUBJECT, deposit: numn(5.41)}, {method: 'clear_identity', args: {}}),
    identitySet(HEAD - 10_000),
]

// the verdicts behind the JudgementGiven rows above, the second lost to a clear in its own block
export const timelineVerdicts = () => [
    {id: squidId(HEAD - 100, 4), kind: 'Reasonable', fee: null},
    {id: squidId(HEAD - 5_000, 2), kind: null, fee: null},
    {id: squidId(HEAD - 5_400, 2), kind: 'KnownGood', fee: numn(12.5)},
]

export const validatorRow = (traits = {}) => ({
    id: SUBJECT,
    active: true,
    lockedAmount: numn(100_000_000),
    lockExpiry: HEAD + 120_960,
    offlineSessions: 2,
    equivocations: 0,
    kicked: null,
    firstSeenBlock: 12_000,
    lastActiveSession: 16_666,
    account: ME,
    ...traits,
})

// days newest first, the way the summary orders them
export const minedDays = count =>
    Array.from({length: count}, (_, i) => ({day: new Date(HEAD_TIME - i * 86_400_000).toISOString().slice(0, 10), blocks: 12 + ((i * 37) % 90)}))

// blocks the subject mined, newest first, some carrying fees on top of the mint
export const minedBlockRows = count => rows(count, (h, i) => block(h, {author: ME, minerFees: i % 2 ? numn(0.0021) : '0'}))

const WTMR = '0xa1795b3c6f74866c7def1df390f9e2e403dca2e9'

const contract = n => '0x' + ('e' + n.toString(16)).repeat(20).slice(0, 40)

const tokenRow = (address, traits = {}) => ({
    id: address,
    name: 'Wrapped Tumor',
    symbol: 'WTMR',
    decimals: 18,
    totalSupply: numn(21_000_000),
    holderCount: 1_204,
    transferCount: 48_211,
    deployTx: {id: hashOf('evm-tx', 300_000, 0), from: contract(0), block: {height: 300_000}},
    firstBlock: 300_010,
    token0: null,
    token1: null,
    token0Symbol: null,
    token1Symbol: null,
    proxyType: null,
    implementations: null,
    ...traits,
})

// a token with an icon, one with six decimals, one that answers nothing and one with a long name
const TOKENS = [
    tokenRow(WTMR),
    tokenRow(contract(1), {name: 'Orbit Credits', symbol: 'ORB', decimals: 6, totalSupply: '1000000000000000'}),
    tokenRow(contract(2), {name: null, symbol: null, decimals: null, totalSupply: null, deployTx: null}),
    tokenRow(contract(3), {name: 'A token name long enough to crowd its balance off the row', symbol: 'LONGNAME'}),
]

export const HOLDING = {balance: numn(1_532.75), token: TOKENS[0]}

// by token name with the nameless token last, the way the query orders them
export const holdingRows = count => {
    const plain = Array.from({length: count - TOKENS.length}, (_, i) => ({balance: numn(1_000 / (i + 1)), token: tokenRow(contract(10 + i), {name: `Token ${String(i + 1).padStart(2, '0')}`, symbol: `TK${i + 1}`})}))
    return [{balance: MAX_U128, token: TOKENS[3]}, {balance: '1234567890', token: TOKENS[1]}, ...plain, HOLDING, {balance: '42', token: TOKENS[2]}]
}

// rows the index keeps for tokens the account doesn't hold, a zero balance or no answer to balanceOf
export const NOT_HELD = [{balance: '0', token: TOKENS[1]}, {balance: null, token: TOKENS[2]}]

const tokenTransfer = (h, i, traits = {}) => {
    const token = TOKENS[i % 2]
    const tx = hashOf('evm', h, i)
    return {
        id: `${tx}-${i}`,
        from: i % 2 === 0 ? SUBJECT_EVM : contract(10 + (i % 5)),
        to: i % 2 === 0 ? contract(20 + (i % 4)) : SUBJECT_EVM,
        amount: token.decimals === 6 ? String(1_000_000 + ((h * 13 + i) % 9_000_000)) : numn(10 + ((h * 13 + i) % 900) / 7),
        timestamp: at(h),
        token: {id: token.id, symbol: token.symbol, decimals: token.decimals},
        transaction: {id: tx},
        block: {height: h},
        ...traits,
    }
}

export const tokenTransferRows = count => rows(count, tokenTransfer)

// one tx's transfers to and from the account at the given log numbers, each amount equal to its log number so the order shows on screen
export const tokenTransfersInOneTx = (h, logIndexes) => {
    const tx = hashOf('evm', h, 0)
    const {id, symbol, decimals} = TOKENS[1]
    return logIndexes.map((logIndex, i) => tokenTransfer(h, i, {id: `${tx}-${logIndex}`, transaction: {id: tx}, token: {id, symbol, decimals}, amount: String(BigInt(logIndex) * 10n ** BigInt(decimals))}))
}

// a token that answers no symbol or decimals, and an amount at the u128 ceiling
export const tokenTransferCases = (height = HEAD - 3) => [
    tokenTransfer(height, 0, {token: {id: TOKENS[2].id, symbol: null, decimals: null}, amount: '42'}),
    tokenTransfer(height - 1, 1, {token: {id: TOKENS[3].id, symbol: TOKENS[3].symbol, decimals: 18}, amount: MAX_U128}),
]

// the PureCreated event that spawned the subject, its args the way the index keeps them
export const pureCreatedBy = (who, height) => ({args: {pure: SUBJECT, who: who.id, proxyType: 'Any', disambiguationIndex: 0}, block: {height}})

const OPEN = ['NewMultisig', 'MultisigApproval']

const count = n => ({totalCount: n})

// what the index keeps for an account delegations point to, each delegator counted once at its largest balance
const delegate = delegations => {
    const most = new Map()
    for (const d of delegations) most.set(d.who.id, BigInt(d.balance) > BigInt(most.get(d.who.id) ?? 0) ? d.balance : most.get(d.who.id))
    return {delegators: most.size, tracks: new Set(delegations.map(d => d.track.id)).size, delegated: sum([...most.values()])}
}

/**
 * Every root field the account page and its tabs read, answered for the
 * account given. Lists are what the open tab shows, counts default to their
 * length and counts.* raises them past one page. Aliased queries on one root
 * field are told apart by their where clause.
 */
export function accountPage({
    account = subject(),
    validator = null,
    registrar = null,
    prime = false,
    minerDays = [],
    mined = [],
    curated = 0,
    childCurated = 0,
    transfers = [],
    extrinsics = [],
    timeline = [],
    verdicts = [],
    subs = [],
    judged = [],
    delegationsOut = [],
    delegationsIn = [],
    proxiesOut = [],
    proxiesIn = [],
    multisigOps = [],
    votes = [],
    voteActions = [],
    delegatedVotes = [],
    referenda = null,
    delegationActions = [],
    govDeposits = [],
    bountyDeposits = [],
    childBountyDeposits = [],
    deploys = 0,
    tokens = 0,
    tokenTransfers = [],
    holdings = [],
    notHeld = [],
    pure = null,
    refs = [],
    counts = {},
}) {
    const self = account.id
    const side = where => (where.from ? 'from' : 'to')
    const sent = where => transfers.filter(t => t[side(where)].id === self)
    const onTrack = id => delegationsIn.filter(d => d.track.id === id)
    const perTrack = id => counts.tracks?.[id] ?? onTrack(id).length
    const allIn = counts.tracks ? Object.values(counts.tracks).reduce((a, b) => a + b, 0) : delegationsIn.length
    // the index keeps rows for tokens the account doesn't hold, only a query asking for a balance above zero leaves them out
    const delegationsSide = where => delegationActions.filter(a => (where.who ? a.who : a.target).id === self)
    const standing = votes.filter(v => !v.removed)
    // a type filter names the kind, and a standard vote's side too
    const ofType = where => votes.filter(v => v.kind === where.kind_eq && (where.aye_eq == null || v.aye === where.aye_eq))
    const holderRows = where => (where.balance_gt === 0 ? holdings : [...holdings, ...notHeld])
    return {
        accountById: account,
        validators: validator ? [validator] : [],
        registrars: ({where}) =>
            where?.account ? (registrar == null ? [] : [{index: registrar}]) : where?.retiredAt_isNull === false ? REGISTRARS.filter(r => r.retiredAt != null) : REGISTRARS,
        primeStates: prime ? [{id: 'prime'}] : [],
        minerDayStats: minerDays,
        blocks: args => (args.where?.author ? mined : args.where?.height_eq != null ? [{height: account.lastActiveBlock, timestamp: at(account.lastActiveBlock)}] : base.blocks(args)),
        blocksConnection: count(counts.mined ?? minerDays.reduce((n, d) => n + d.blocks, 0)),
        bountiesConnection: count(curated),
        childBountiesConnection: count(childCurated),
        transfersConnection: ({where}) => count(where.OR ? (counts.transfers ?? transfers.length) : (counts[side(where)] ?? sent(where).length)),
        transfers: ({where}) => (where.OR ? transfers : sent(where)),
        extrinsicsConnection: count(counts.extrinsics ?? extrinsics.length),
        extrinsics,
        eventsConnection: count(counts.timeline ?? timeline.length),
        events: ({where}) => (where.method_eq === 'PureCreated' ? (pure ? [pure] : []) : timeline),
        judgements: ({where}) => (where.id_in ? verdicts : judged),
        judgementsConnection: count(counts.judged ?? judged.length),
        accountsConnection: count(counts.subs ?? subs.length),
        accounts: ({where}) => (where?.id_in ? refs : subs),
        delegationsConnection: ({where}) => count(!where.target ? delegationsOut.length : where.track ? perTrack(where.track.id_eq) : allIn),
        delegations: ({where}) => (!where.target ? delegationsOut : where.track ? onTrack(where.track.id_eq) : delegationsIn),
        tracks: TRACKS,
        proxyRelationsConnection: ({where}) => count((where.delegator ? proxiesOut : proxiesIn).length),
        proxyRelations: args => (args.where.delegator ? proxiesOut : paged(proxiesIn)(args)),
        multisigOpsConnection: ({where}) => count(where.OR ? multisigOps.length : multisigOps.filter(o => o.multisig.id === self).length),
        multisigOps: args =>
            args.where.status_in
                ? multisigOps.filter(o => o.depositor.id === self && OPEN.includes(o.status))
                : args.where.signatories_isNull === false
                  ? multisigOps.filter(o => o.multisig.id === self && o.signatories != null)
                  : paged(multisigOps)(args),
        // the vote record lists every referendum, one through the highest the account voted on unless set
        referendums: ({where}) => (where ? govDeposits : (referenda ?? Array.from({length: Math.max(-1, ...votes.map(v => v.referendum.index)) + 1}, (_, index) => ({index, title: `Referendum ${index} title`})))),
        bounties: bountyDeposits,
        childBounties: childBountyDeposits,
        votesConnection: ({where}) => count(where.removed_eq === false ? (where.referendum ? standing.filter(v => v.referendum.status === 'Ongoing') : standing).length : where.kind_eq ? ofType(where).length : votes.length),
        delegatedVotes,
        referendumsConnection: count(counts.referenda ?? new Set(votes.map(v => v.referendum.index)).size),
        delegateById: delegationsIn.length > 0 ? delegate(delegationsIn) : null,
        votes: args => (args.where?.removed_eq === false ? standing : paged(votes)(args)),
        votingActionsConnection: count(counts.voteActions ?? voteActions.length),
        votingActions: paged(voteActions),
        delegationActionsConnection: ({where}) => count(where.OR ? (counts.delegationActions ?? delegationActions.length) : delegationsSide(where).length),
        delegationActions: args => paged(args.where.OR ? delegationActions : delegationsSide(args.where))(args),
        evmTransactionsConnection: count(deploys),
        tokensConnection: count(tokens),
        tokenTransfersConnection: count(counts.tokenTransfers ?? tokenTransfers.length),
        tokenTransfers,
        tokenHoldersConnection: ({where}) => count(counts.holdings ?? holderRows(where).length),
        tokenHolders: ({where}) => holderRows(where),
    }
}
