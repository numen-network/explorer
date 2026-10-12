import {gzipSync} from 'fflate'
import {toHex} from '../engine.js'
import {at, block, chainInfo, event, extrinsic, hashOf, hex, numn, person, squidId} from '../fixtures.js'

export const REWARD = numn(16)
const TREASURY = chainInfo.treasuryAccount

export const CHAIN_PROPS = (({name, head, finalizedHead, ...rest}) => ({chain: name, ...rest}))(chainInfo)

const ascii = text => Array.from(text, c => c.charCodeAt(0))
const bytesOf = h => Array.from(h.slice(2).match(/../g) ?? [], b => parseInt(b, 16))
const compact = n => (n < 64 ? [n << 2] : [((n << 2) | 1) & 0xff, n >> 6])
const item = (kind, engine, payload) => toHex([kind, ...ascii(engine), ...compact(payload.length), ...payload])

// header digest items, a kind byte, a four byte engine on the consensus kinds and a length prefixed payload
export const DIGEST = {
    preRuntime: author => item(6, 'pow_', bytesOf(author)),
    frontier: evmHash => item(4, 'fron', [1, ...bytesOf(evmHash), 0]),
    seal: (nonce, work) => item(5, 'pow_', [...bytesOf(nonce).reverse(), ...bytesOf(work)]),
    grandpaChange: authorities => item(4, 'FRNK', [1, ...compact(authorities.length), ...authorities.flatMap(a => [...bytesOf(a), 1, 0, 0, 0, 0, 0, 0, 0]), 0, 0, 0, 0]),
    other: text => item(0, '', ascii(text)),
    unknown: kind => item(kind, '', [0xde, 0xad, 0xbe, 0xef]),
    runtimeUpdated: '0x08',
    truncated: '0x05706f775f0101' + 'ab'.repeat(8),
}

export const nonceOf = height => hashOf('nonce', height)
// a pow hash starts with the zeros its difficulty asked for
export const workOf = height => '0x0000000' + hashOf('work', height).slice(9)

export function sealed(height, traits = {}) {
    const b = block(height, {reward: REWARD, nonce: nonceOf(height), workHash: workOf(height), ...traits})
    const author = b.author ? [DIGEST.preRuntime(b.author.id)] : []
    return {logs: [...author, DIGEST.frontier(hashOf('evm', height)), DIGEST.seal(b.nonce, b.workHash)], ...b}
}

// genesis has no seal, no author and no timestamp inherent
export const GENESIS = {
    ...block(0),
    parentHash: '0x' + '0'.repeat(64),
    timestamp: null,
    author: null,
    reward: '0',
    minerFees: '0',
    treasuryFees: '0',
    nonce: null,
    workHash: null,
    finalized: true,
    extrinsicCount: 0,
    eventCount: 0,
    logs: [],
}

const PHI = (1 + Math.sqrt(5)) / 2
const ICOSAHEDRON = {
    vertices: [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]],
    faces: [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]],
}

// every face splits in four, an edge shared by two faces gets one midpoint
function subdivide({vertices, faces}) {
    const out = [...vertices]
    const made = new Map()
    const mid = (a, b) => {
        const key = Math.min(a, b) * 65536 + Math.max(a, b)
        if (!made.has(key)) made.set(key, out.push(out[a].map((x, i) => (x + out[b][i]) / 2)) - 1)
        return made.get(key)
    }
    const split = ([a, b, c]) => {
        const [ab, bc, ca] = [mid(a, b), mid(b, c), mid(c, a)]
        return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]
    }
    return {vertices: out, faces: faces.flatMap(split)}
}

// one mesh per protocol, shared by every object mined on it. poscan-v1 is the
// mainnet mesh, 2562 vertices on 5120 faces, poscan-v2 a coarser 642 on 1280
const COARSE = [0, 0, 0].reduce(subdivide, ICOSAHEDRON)
const SPHERES = {'poscan-v1': subdivide(COARSE), 'poscan-v2': COARSE}
const gz = typed => toHex(gzipSync(new Uint8Array(typed.buffer)))

function rock(seed, sphere, [sx, sy, sz]) {
    const phase = k => (seed * (k + 1) * 0.731) % (2 * Math.PI)
    const point = v => {
        const n = Math.hypot(...v)
        const [x, y, z] = v.map(c => c / n)
        const r = 1 + 0.16 * Math.sin(2.1 * x + phase(0)) * Math.sin(1.7 * y + phase(1)) + 0.09 * Math.sin(3.3 * z + phase(2)) * Math.cos(2.6 * x + phase(3)) + 0.04 * Math.sin(6.1 * y + phase(4))
        return [sx * x * r, sy * y * r, sz * z * r]
    }
    return gz(new Float64Array(sphere.vertices.flatMap(point)))
}

export const topology = protocol => ({id: protocol, faces: gz(new Uint16Array(SPHERES[protocol].faces.flat())), faceCount: SPHERES[protocol].faces.length})
// axes stretch the rock along x, y and z
export const minedObject = (height, protocol, axes = [1.25, 1, 0.85]) => ({protocol, vertexCount: SPHERES[protocol].vertices.length, vertices: rock(height, SPHERES[protocol], axes)})

// a call id is its extrinsic id followed by the path down from the root, so the root shares the extrinsic id
export const callId = (height, index, address = []) => [squidId(height, index), ...address.map(a => String(a).padStart(6, '0'))].join('-')

const ID = who => ({__kind: 'Id', value: who})
const info = (refTime, proofSize, kind = 'Normal', pays = 'Yes') => ({dispatchInfo: {weight: {refTime: String(refTime), proofSize: String(proofSize)}, class: {__kind: kind}, paysFee: {__kind: pays}}})
const miner = height => person(height).id
const on = (address, ...events) => events.map(([name, args]) => [name, args, address])

export const FUNDS_UNAVAILABLE = {__kind: 'Token', value: {__kind: 'FundsUnavailable'}}
export const NOT_VOTER = {__kind: 'Module', value: {index: 20, error: '0x01000000'}}

// what the payer was charged over the fee and the tip comes back first, then the inclusion fee goes one part to the miner and four to the treasury, the tip reaches the miner whole
function charge(who, height, fee, tip = 0n, refund = 0n) {
    const share = fee / 5n
    return {
        traits: {fee: String(fee), tip: String(tip), minerFee: String(share), treasuryFee: String(fee - share)},
        withdraw: ['Balances.Withdraw', {who, amount: String(fee + tip + refund)}],
        paid: [
            ...(refund > 0n ? [['Balances.Deposit', {who, amount: String(refund)}]] : []),
            ['Balances.Deposit', {who: miner(height), amount: String(share)}],
            ['Balances.Deposit', {who: TREASURY, amount: String(fee - share)}],
            ['Balances.Deposit', {who: miner(height), amount: String(tip)}],
            ['TransactionPayment.TransactionFeePaid', {who, actualFee: String(fee + tip), tip: String(tip)}],
        ],
    }
}

const unpaid = {signer: null, fee: null, tip: null, minerFee: '0', treasuryFee: '0'}
const payee = (height, i) => person(height + i * 3 + 1)
const amount = (height, i) => numn(1 + ((height * 31 + i * 17) % 5000) / 3)
const transferCall = to => value => ({__kind: 'Balances', value: {__kind: 'transfer_keep_alive', dest: ID(to.id), value}})

// the batch marks each item complete after its own events, and the fee withdrawal lands on the first item because the indexer walks events back from the end
const items = (base, list) => list.flatMap(([address, events]) => [...on([...base, address], ...events), ...on(base, ['Utility.ItemCompleted', null])])

export const timestampSet = height => ({
    pallet: 'Timestamp',
    method: 'set',
    ...unpaid,
    calls: [[[], 'Timestamp.set', {now: String(Date.parse(at(height)))}]],
    events: [['System.ExtrinsicSuccess', info(241801000, 1493, 'Mandatory'), null]],
})

export const heartbeat = (height, authorityIndex = 2) => ({
    pallet: 'ImOnline',
    method: 'heartbeat',
    ...unpaid,
    calls: [[[], 'ImOnline.heartbeat', {heartbeat: {blockNumber: height - 2, sessionIndex: Math.floor(height / 60), authorityIndex, validatorsLen: 4}, signature: hashOf('heartbeat', height) + hashOf('signature', height).slice(2)}]],
    events: [...on([], ['ImOnline.HeartbeatReceived', {authorityId: hashOf('authority', authorityIndex)}]), ['System.ExtrinsicSuccess', info(429296120, 33615), null]],
})

export function transfer(height, {from = person(height + 2), to = person(height + 5), value = amount(height, 0), fee = 6_562_090_000_000_000n, tip = 0n} = {}) {
    const pay = charge(from.id, height, fee, tip)
    return {
        pallet: 'Balances',
        method: 'transfer_keep_alive',
        signer: from,
        ...pay.traits,
        calls: [[[], 'Balances.transfer_keep_alive', {dest: ID(to.id), value}]],
        events: [...on([], pay.withdraw, ['Balances.Transfer', {from: from.id, to: to.id, amount: value}], ...pay.paid), ['System.ExtrinsicSuccess', info(291005000, 3593), null]],
    }
}

export function batchAll(height, {from = person(height + 1), count = 7, fee = 12_672_434_050_000_000n} = {}) {
    const pays = Array.from({length: count}, (_, i) => [payee(height, i), amount(height, i)])
    const pay = charge(from.id, height, fee)
    return {
        pallet: 'Utility',
        method: 'batch_all',
        signer: from,
        ...pay.traits,
        calls: [[[], 'Utility.batch_all', {calls: pays.map(([to, value]) => transferCall(to)(value))}], ...pays.map(([to, value], i) => [[i], 'Balances.transfer_keep_alive', {dest: ID(to.id), value}])],
        events: [
            ...on([0], pay.withdraw),
            ...items([], pays.map(([to, value], i) => [i, [['Balances.Transfer', {from: from.id, to: to.id, amount: value}]]])),
            ...on([], ['Utility.BatchCompleted', null], ...pay.paid),
            ['System.ExtrinsicSuccess', info(1426673810, 25151), null],
        ],
    }
}

// a plain batch stops at the first failing item, the items after it never ran and leave no call behind
export function batchInterrupted(height, {from = person(height + 6), fee = 9_870_412_000_000_000n, tip = 0n, refund = 0n} = {}) {
    const pays = [0, 1, 2, 3].map(i => [payee(height, i), amount(height, i)])
    const pay = charge(from.id, height, fee, tip, refund)
    return {
        pallet: 'Utility',
        method: 'batch',
        signer: from,
        ...pay.traits,
        // the item past the interruption never ran, so the indexer fills it in with no outcome
        calls: [[[], 'Utility.batch', {calls: pays.map(([to, value]) => transferCall(to)(value))}], ...pays.map(([to, value], i) => [[i], 'Balances.transfer_keep_alive', {dest: ID(to.id), value}, {success: i < 2 ? true : i === 2 ? false : null}])],
        events: [
            ...on([0], pay.withdraw),
            ...items([], pays.slice(0, 2).map(([to, value], i) => [i, [['Balances.Transfer', {from: from.id, to: to.id, amount: value}]]])),
            ...on([], ['Utility.BatchInterrupted', {index: 2, error: FUNDS_UNAVAILABLE}], ...pay.paid),
            ['System.ExtrinsicSuccess', info(1009212440, 17965), null],
        ],
    }
}

// a proxy runs a batch for the account it stands in for, so every call under the root dispatches as that account
export function proxied(height, {from = person(height + 4), real = person(height + 8), fee = 10_512_604_000_000_000n, tip = 0n} = {}) {
    const pays = [0, 1].map(i => [payee(height, i), amount(height, i)])
    const remark = hex('payroll for september, approved by the board on the 28th')
    const inner = [...pays.map(([to, value]) => transferCall(to)(value)), {__kind: 'System', value: {__kind: 'remark_with_event', remark}}]
    const as = {origin: real}
    const pay = charge(from.id, height, fee, tip)
    return {
        pallet: 'Proxy',
        method: 'proxy',
        signer: from,
        ...pay.traits,
        calls: [
            [[], 'Proxy.proxy', {real: ID(real.id), call: {__kind: 'Utility', value: {__kind: 'batch_all', calls: inner}}}],
            [[0], 'Utility.batch_all', {calls: inner}, as],
            ...pays.map(([to, value], i) => [[0, i], 'Balances.transfer_keep_alive', {dest: ID(to.id), value}, as]),
            [[0, 2], 'System.remark_with_event', {remark}, as],
        ],
        events: [
            ...on([0, 0], pay.withdraw),
            ...items([0], [...pays.map(([to, value], i) => [i, [['Balances.Transfer', {from: real.id, to: to.id, amount: value}]]]), [2, [['System.Remarked', {sender: real.id, hash: hashOf('remark', height)}]]]]),
            ...on([0], ['Utility.BatchCompleted', null]),
            ...on([], ['Proxy.ProxyExecuted', {result: {__kind: 'Ok'}}], ...pay.paid),
            ['System.ExtrinsicSuccess', info(1630441000, 31270), null],
        ],
    }
}

// a batch of proxy calls, so the tree steps between two depths all the way down
export function batchOfProxies(height, {from = person(height + 4), real = person(height + 8), count = 15, fee = 31_412_604_000_000_000n} = {}) {
    const pays = Array.from({length: count}, (_, i) => [payee(height, i), amount(height, i)])
    const pay = charge(from.id, height, fee)
    return {
        pallet: 'Utility',
        method: 'batch_all',
        signer: from,
        ...pay.traits,
        calls: [
            [[], 'Utility.batch_all', {calls: pays.map(([to, value]) => ({__kind: 'Proxy', value: {__kind: 'proxy', real: ID(real.id), call: transferCall(to)(value)}}))}],
            ...pays.flatMap(([to, value], i) => [
                [[i], 'Proxy.proxy', {real: ID(real.id), call: transferCall(to)(value)}],
                [[i, 0], 'Balances.transfer_keep_alive', {dest: ID(to.id), value}, {origin: real}],
            ]),
        ],
        events: [
            ...on([0, 0], pay.withdraw),
            ...pays.flatMap(([to, value], i) => [
                ...on([i, 0], ['Balances.Transfer', {from: real.id, to: to.id, amount: value}]),
                ...on([i], ['Proxy.ProxyExecuted', {result: {__kind: 'Ok'}}]),
                ...on([], ['Utility.ItemCompleted', null]),
            ]),
            ...on([], ['Utility.BatchCompleted', null], ...pay.paid),
            ['System.ExtrinsicSuccess', info(2140873000, 61204), null],
        ],
    }
}

// what governance submissions look like on chain, the text noted as a preimage, the referendum and its metadata in one batch
export function referendumSubmission(height, {from = person(height + 7), index = 12, fee = 47_851_390_862_172_944n} = {}) {
    const text = hex(
        'Fund a community translation sprint\n\nThis proposal asks the treasury to pay for translating the wallet, the explorer and the documentation into Spanish, Portuguese, Turkish and Vietnamese. ' +
            'Translators are paid per reviewed page, every page is checked by a second native speaker before it ships, and the glossary is published so later work stays consistent. ' +
            'The budget covers twelve weeks of work and a final review, unused funds return to the treasury.'
    )
    const preimage = hashOf('preimage', height)
    const proposal = {__kind: 'Inline', value: '0x17051f0000004a48011416954508' + from.id.slice(2) + '01ca1d0200'}
    const submit = {proposalOrigin: {__kind: 'Origins', value: {__kind: 'SmallSpender'}}, proposal, enactmentMoment: {__kind: 'After', value: 8640}}
    const pay = charge(from.id, height, fee)
    return {
        pallet: 'Utility',
        method: 'batch_all',
        signer: from,
        ...pay.traits,
        calls: [
            [[], 'Utility.batch_all', {calls: [{__kind: 'Preimage', value: {__kind: 'note_preimage', bytes: text}}, {__kind: 'Referenda', value: {__kind: 'submit', ...submit}}, {__kind: 'Referenda', value: {__kind: 'set_metadata', index, maybeHash: preimage}}]}],
            [[0], 'Preimage.note_preimage', {bytes: text}],
            [[1], 'Referenda.submit', submit],
            [[2], 'Referenda.set_metadata', {index, maybeHash: preimage}],
        ],
        events: [
            ...on([0], pay.withdraw),
            ...items([], [
                [0, [['Balances.Held', {reason: {__kind: 'Preimage', value: {__kind: 'Preimage'}}, who: from.id, amount: numn(14.2)}], ['Preimage.Noted', {hash: preimage}]]],
                [1, [['Balances.Reserved', {who: from.id, amount: numn(5)}], ['Scheduler.Scheduled', {when: height + 120960, index: 0}], ['Referenda.Submitted', {index, track: 30, proposal}]]],
                [2, [['Referenda.MetadataSet', {index, hash: preimage}]]],
            ]),
            ...on([], ['Utility.BatchCompleted', null], ...pay.paid),
            ['System.ExtrinsicSuccess', info(1177601874, 117874), null],
        ],
    }
}

// the same submission rolled back whole, so nothing under the root took effect and the chain kept no outcome for it
export function failedReferendumSubmission(height, options = {}) {
    const sent = referendumSubmission(height, options)
    const pay = charge(sent.signer.id, height, BigInt(sent.fee))
    return {
        ...sent,
        success: false,
        error: FUNDS_UNAVAILABLE,
        calls: sent.calls.map(([address, name, args]) => [address, name, args, {success: address.length === 0 ? false : null}]),
        events: [...on(null, pay.withdraw, ...pay.paid), ['System.ExtrinsicFailed', {dispatchError: FUNDS_UNAVAILABLE, ...info(1177601874, 117874)}, null]],
    }
}

// a payout batch of vested transfers to fresh accounts, the shape of the mainnet airdrop
export function vestingPayout(height, {from = person(height + 9), count = 526, fee = 12_165_929_270_967_012_434n} = {}) {
    const grants = Array.from({length: count}, (_, i) => [hashOf('grantee', i), numn(1000 + ((i * 7919) % 90000)), numn(0.5 + (i % 17) / 10)])
    const pay = charge(from.id, height, fee)
    const schedule = (locked, perBlock) => ({locked, perBlock, startingBlock: 0})
    return {
        pallet: 'Utility',
        method: 'batch_all',
        signer: from,
        ...pay.traits,
        calls: [
            [[], 'Utility.batch_all', {calls: grants.map(([to, locked, perBlock]) => ({__kind: 'Vesting', value: {__kind: 'vested_transfer', target: ID(to), schedule: schedule(locked, perBlock)}}))}],
            ...grants.map(([to, locked, perBlock], i) => [[i], 'Vesting.vested_transfer', {target: ID(to), schedule: schedule(locked, perBlock)}]),
        ],
        events: [
            ...on([0], pay.withdraw),
            ...items([], grants.map(([to, locked], i) => [i, [
                ['System.NewAccount', {account: to}],
                ['Balances.Endowed', {account: to, freeBalance: locked}],
                ['Balances.Transfer', {from: from.id, to, amount: locked}],
                ['Balances.Locked', {who: to, amount: locked}],
                ['Vesting.VestingCreated', {account: to, scheduleIndex: 0}],
                ['Vesting.VestingUpdated', {account: to, unvested: locked}],
            ]])),
            ...on([], ['Utility.BatchCompleted', null], ...pay.paid),
            ['System.ExtrinsicSuccess', info(98734561230, 2804117), null],
        ],
    }
}

// a signed call that pays its fee and raises the given events on top
export function signedCall(height, name, args, options = {}) {
    const {from = person(height + 2), fee = 6_562_090_000_000_000n, events = []} = options
    const [pallet, method] = name.split('.')
    const pay = charge(from.id, height, fee)
    return {
        pallet,
        method,
        signer: from,
        ...pay.traits,
        calls: [[[], name, args]],
        events: [...on([], pay.withdraw, ...events, ...pay.paid), ['System.ExtrinsicSuccess', info(312450000, 4210), null]],
    }
}

// a failed call still pays its fee, and the indexer ties none of its events to a call
export function failedCall(height, name, args, error, {from = person(height + 3), fee = 10_944_325_000_000_000n} = {}) {
    const [pallet, method] = name.split('.')
    const pay = charge(from.id, height, fee)
    return {
        pallet,
        method,
        signer: from,
        success: false,
        error,
        ...pay.traits,
        calls: [[[], name, args, {success: false}]],
        events: [...on(null, pay.withdraw, ...pay.paid), ['System.ExtrinsicFailed', {dispatchError: error, ...info(1178652000, 219984)}, null]],
    }
}

export const failedVoteRemoval = height => failedCall(height, 'ConvictionVoting.remove_vote', {class: 32, index: 0}, NOT_VOTER)

export const failedTransfer = (height, {from = person(height + 3), to = person(height + 6)} = {}) =>
    failedCall(height, 'Balances.transfer_keep_alive', {dest: ID(to.id), value: numn(250_000)}, FUNDS_UNAVAILABLE, {from, fee: 6_562_090_000_000_000n})

export const evmTxHash = height => hashOf('evm-tx', height)
const evmAddress = n => '0x' + hashOf('evm', n).slice(2, 42)

// an ethereum transaction carries no substrate signature, it pays the base fee per gas and the priority fee as its tip
export function evmTransact(height, {gasUsed = 51_234n, baseFee = 1_000_000_000_000n, priorityFee = 500_000_000_000n} = {}) {
    const from = evmAddress(1)
    const to = evmAddress(2)
    const sender = hashOf('mapped', from)
    const fee = gasUsed * baseFee
    const tip = gasUsed * priorityFee
    const pay = charge(sender, height, fee, tip)
    const topics = ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', '0x' + from.slice(2).padStart(64, '0'), '0x' + evmAddress(3).slice(2).padStart(64, '0')]
    return {
        pallet: 'Ethereum',
        method: 'transact',
        signer: null,
        ...pay.traits,
        calls: [[[], 'Ethereum.transact', null]],
        events: [
            ...on([], pay.withdraw, ['Balances.Deposit', {who: sender, amount: '0'}], ...pay.paid.slice(0, 3)),
            ...on([], ['EVM.Log', {log: {address: to, topics, data: '0x' + (125n * 10n ** 18n).toString(16).padStart(64, '0')}}]),
            ...on([], ['Ethereum.Executed', {from, to, transactionHash: evmTxHash(height), exitReason: {__kind: 'Succeed', value: {__kind: 'Returned'}}, extraData: '0x'}]),
            ['System.ExtrinsicSuccess', info(1024680000, 5909, 'Normal', 'No'), null],
        ],
    }
}

// the indexer counts the calls at the bottom of the tree under the root by name, in preorder, and writes null when the root wraps nothing
function leafCalls(tree) {
    const wrappers = new Set(tree.map(c => c.id.split('-').slice(0, -1).join('-')))
    const counts = new Map()
    for (const {id, address, pallet, method} of tree) {
        if (address.length === 0 || wrappers.has(id)) continue
        const name = `${pallet}.${method}`
        counts.set(name, {pallet, method, count: (counts.get(name)?.count ?? 0) + 1})
    }
    return counts.size > 0 ? [...counts.values()] : null
}

// one extrinsic, its call tree and the events it raised, joined by the ids the indexer gives them
function scene(height, index, first, {calls, events, ...traits}) {
    const x = extrinsic(height, index, traits)
    const below = address => calls.filter(([a]) => a.length === address.length + 1 && address.every((step, i) => a[i] === step)).slice(0, 1)
    const tree = calls.map(([address, name, args, more]) => {
        const [pallet, method] = name.split('.')
        const subcalls = below(address).map(([a]) => ({id: callId(height, index, a)}))
        return {id: callId(height, index, address), address, pallet, method, args, success: true, origin: x.signer, block: {specVersion: block(height).specVersion}, subcalls, ...more}
    })
    const raisedBy = address => {
        const c = address && tree.find(t => t.address.join() === address.join())
        return c ? {id: c.id, pallet: c.pallet, method: c.method} : null
    }
    const raised = events.map(([name, args, address], k) => {
        const [pallet, method] = name.split('.')
        return event(height, first + k, {pallet, method, args, extrinsic: {id: x.id}, call: raisedBy(address)})
    })
    return {extrinsic: {...x, leafCalls: leafCalls(tree)}, calls: tree, events: raised}
}

const runtimeEvents = (height, list, phase, first) =>
    list.map(([name, args], k) => {
        const [pallet, method] = name.split('.')
        return event(height, first + k, {phase, pallet, method, args})
    })

export const reward = height => [
    ['Balances.Deposit', {who: miner(height), amount: REWARD}],
    ['Balances.Issued', {amount: REWARD}],
]

export const sessionStart = height => [
    ['ImOnline.AllGood', null],
    ['Historical.RootStored', {index: height / 60 + 1}],
    ['Session.NewSession', {sessionIndex: height / 60}],
]

const sum = values => String(values.reduce((a, v) => a + BigInt(v), 0n))

// a sealed block with its extrinsics in order and its events numbered across the whole block
export function mined(height, specs, {initialization, traits} = {}) {
    const runtime = initialization ?? []
    let next = runtime.length
    const scenes = specs.map((spec, i) => {
        const s = scene(height, i, next, spec(height))
        next += s.events.length
        return s
    })
    const extrinsics = scenes.map(s => s.extrinsic)
    const events = [...runtimeEvents(height, runtime, 'Initialization', 0), ...scenes.flatMap(s => s.events), ...runtimeEvents(height, reward(height), 'Finalization', next)]
    return {
        block: sealed(height, {
            extrinsicCount: extrinsics.length,
            eventCount: events.length,
            minerFees: sum(extrinsics.map(x => BigInt(x.minerFee) + BigInt(x.tip ?? 0))),
            treasuryFees: sum(extrinsics.map(x => x.treasuryFee)),
            ...traits,
        }),
        extrinsics,
        calls: scenes.flatMap(s => s.calls),
        events,
    }
}

export const tipped = height => transfer(height, {tip: 2_000_000_000_000_000n})

// one extrinsic of every shape the explorer draws differently
export const busy = height => mined(height, [timestampSet, heartbeat, tipped, batchAll, failedVoteRemoval, proxied, evmTransact, batchInterrupted, referendumSubmission])

// one extrinsic out of a mined block, the way its detail page reads it, each call carrying the events it raised
export function pick({extrinsics, calls, events}, index) {
    const x = extrinsics[index]
    const raised = events.filter(e => e.extrinsic?.id === x.id)
    const tree = calls.filter(c => c.id === x.id || c.id.startsWith(x.id + '-'))
    return {extrinsics: [x], calls: tree.map(c => ({...c, events: raised.filter(e => e.call?.id === c.id)})), events: raised}
}
