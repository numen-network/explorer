import {toHex} from './engine.js'

export const HEAD = 1_000_000
export const HEAD_TIME = Date.now()
export const BLOCK_TIME = 10

export const at = height => new Date(HEAD_TIME - (HEAD - height) * BLOCK_TIME * 1000).toISOString()
export const numn = n => (BigInt(Math.round(n * 1e6)) * 10n ** 12n).toString()
export const hex = text => toHex(new TextEncoder().encode(text))

const fnv = text => {
    let x = 2166136261
    for (const c of text) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0
    return x.toString(16).padStart(8, '0')
}

// a 32 byte hash that depends only on its seed, so every story renders the same
export const hashOf = (...seed) => '0x' + Array.from({length: 8}, (_, i) => fnv(`${seed.join(':')}#${i}`)).join('')
export const account = n => hashOf('account', n)
export const blockId = height => `${String(height).padStart(10, '0')}-${hashOf('block', height).slice(2, 7)}`
export const squidId = (height, index) => `${blockId(height)}-${String(index).padStart(6, '0')}`

export const SUBMISSION_DEPOSIT = numn(5)

export const chainInfo = {
    name: 'Numen Mainnet',
    symbol: 'NUMN',
    decimals: 18,
    ss58: 14240,
    blockTime: BLOCK_TIME,
    existentialDeposit: '0',
    evmChainId: 32026,
    nativeErc20: '0x0000000000000000000000000000000000000802',
    sessionLength: 60,
    sessionOffset: 0,
    voteLockingPeriod: 60480,
    submissionDeposit: SUBMISSION_DEPOSIT,
    treasuryAccount: '0x6d6f646c70792f74727372790000000000000000000000000000000000000000',
    head: HEAD,
    finalizedHead: HEAD - 5,
}

export const issuance = {
    issuanceTotal: '602518848000000000000000000',
    issuanceInactive: '550000154663232139351368277',
    treasuryPot: '550000154663232139351368277',
}

// what every page reads before its own data, the chain and the newest indexed block
export const base = {
    chainInfos: [chainInfo],
    blocks: () => [{height: HEAD, timestamp: new Date().toISOString()}],
}

const FIELDS = ['display', 'avatar', 'bio', 'web', 'email', 'github', 'matrix', 'x', 'telegram', 'discord']

export function identity(display, {judgements = ['Reasonable'], ...fields} = {}) {
    const info = Object.fromEntries(FIELDS.map(key => [key, hex(key === 'display' ? (display ?? '') : (fields[key] ?? ''))]))
    const verdicts = judgements.map((kind, registrar) => [registrar, kind === 'FeePaid' ? {__kind: kind, value: numn(2.5)} : {__kind: kind}])
    return {identityDisplay: display, identityJson: {info, judgements: verdicts, deposit: numn(5.41)}}
}

export const subData = name => (name == null ? {__kind: 'None'} : {__kind: `Raw${new TextEncoder().encode(name).length}`, value: hex(name)})

export const subOf = (parent, name) => ({
    identitySubName: name,
    identitySubData: subData(name),
    identitySuper: {identityDisplay: parent.identityDisplay, identityJson: parent.identityJson},
})

export const acct = (n, ...traits) => Object.assign({id: account(n)}, ...traits)

const POLARIS = identity('Polaris Guild', {judgements: ['KnownGood'], web: 'polaris.example', x: '@polaris_guild', discord: 'polarisguild'})

// one account per way an address line can render, lists cycle through them
export const PEOPLE = [
    acct(1, POLARIS),
    acct(2, identity('Orbit Labs')),
    acct(3),
    acct(4, identity('Redshift', {judgements: ['OutOfDate']})),
    acct(5, identity('Spamlord', {judgements: ['Erroneous']})),
    acct(6, identity('Nova Fund', {judgements: ['FeePaid']})),
    acct(7, identity('Muddy Waters', {judgements: []})),
    acct(8, identity('Longest display a chain can hold')),
    acct(9, subOf(POLARIS, 'payouts')),
    acct(10),
]
export const person = i => PEOPLE[i % PEOPLE.length]

export const block = (height, traits = {}) => ({
    id: blockId(height),
    height,
    hash: hashOf('block', height),
    parentHash: hashOf('block', height - 1),
    timestamp: at(height),
    specVersion: 10000,
    author: person(height),
    difficulty: String(4_000_000_000 + (height % 97) * 10_000_000),
    reward: numn(150),
    minerFees: numn((height % 7) * 0.0021),
    treasuryFees: numn((height % 7) * 0.0084),
    nonce: hashOf('nonce', height),
    workHash: hashOf('work', height),
    finalized: height <= HEAD - 5,
    extrinsicCount: 1 + (height % 4),
    eventCount: 3 + (height % 9),
    ...traits,
})

export const extrinsic = (height, index, traits = {}) => ({
    id: squidId(height, index),
    block: {height, timestamp: at(height)},
    indexInBlock: index,
    hash: hashOf('extrinsic', height, index),
    pallet: 'Balances',
    method: 'transfer_keep_alive',
    leafCalls: null,
    signer: person(height + index),
    success: true,
    error: null,
    fee: numn(0.0105),
    tip: '0',
    minerFee: numn(0.0021),
    treasuryFee: numn(0.0084),
    ...traits,
})

export const event = (height, index, traits = {}) => ({
    id: squidId(height, index),
    block: {height, timestamp: at(height), specVersion: block(height).specVersion},
    indexInBlock: index,
    phase: 'ApplyExtrinsic',
    pallet: 'Balances',
    method: 'Transfer',
    args: null,
    call: null,
    extrinsic: null,
    ...traits,
})

export const transfer = (height, index, traits = {}) => ({
    id: squidId(height, index),
    amount: numn(1 + ((height * 31 + index * 17) % 5000) / 3),
    timestamp: at(height),
    call: {pallet: 'Balances', method: 'transfer_keep_alive'},
    from: person(height),
    to: person(height + index + 1),
    block: {height},
    extrinsic: {id: squidId(height, index)},
    ...traits,
})

// rows newest first, the way every list page orders them
export const rows = (count, make) => Array.from({length: count}, (_, i) => make(HEAD - i * 7, i))

// a list field answering each query with the slice its limit and offset ask for
export const paged = list => ({limit, offset = 0}) => (limit == null ? list : list.slice(offset, offset + limit))
