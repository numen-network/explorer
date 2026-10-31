import {hexToBytes} from '@noble/hashes/utils.js'
import {describeNotedBytes, describeReferendumArgs, nodesOf, type ArgNode, type NotedLine, type Preimage} from '@/lib/args'
import {accountRefs, indexTitles, preimageNoteCalls, preimageNotes, preimagesByHash, specVersionAt, type PreimageHit} from '@/lib/gql'
import {blake2_256} from '@/lib/hash'

// a hash the index knows as a referendum text or proposal
async function markPreimages(nodes: (ArgNode | null)[]): Promise<void> {
    const found = nodesOf(nodes, 'hex').filter(n => n.hex.length === 66 && !n.noted)
    if (found.length === 0) return
    const {texts, proposals} = await preimagesByHash([...new Set(found.map(n => n.hex))])
    const known = new Map<string, Preimage>()
    for (const t of texts) {
        if (known.has(t.hash)) continue
        known.set(t.hash, {kind: 'text', referendum: t.referendum.index, title: t.title, text: [t.title, t.description].filter(Boolean).join('\n\n')})
    }
    for (const r of proposals) {
        const spec = await specVersionAt(r.submittedAt)
        const call = r.proposalPallet && r.proposalMethod ? describeReferendumArgs({pallet: r.proposalPallet, method: r.proposalMethod, args: r.proposalCalls?.[0]?.args, specVersion: spec, nested: false}, r.index) : null
        known.set(r.proposalHash, {kind: 'proposal', referendum: r.index, title: r.title, call: call && {kind: 'call', name: `${r.proposalPallet}.${r.proposalMethod}`, args: call}})
    }
    for (const node of found) node.preimage = known.get(node.hex)
}

export type Use = NonNullable<NotedLine['referendum']> & {at: number}

function preimageUses({texts, proposals}: PreimageHit, hash: string): Use[] {
    const uses = new Map<string, Use>()
    for (const t of texts) if (t.hash === hash && !uses.has(`text-${t.referendum.index}`)) uses.set(`text-${t.referendum.index}`, {kind: 'text', index: t.referendum.index, title: t.title, at: t.block})
    for (const r of proposals) if (r.proposalHash === hash) uses.set(`call-${r.index}`, {kind: 'call', index: r.index, title: r.title, at: r.submittedAt})
    return [...uses.values()].sort((a, b) => a.at - b.at)
}

// the chain ties no note to a referendum, each use goes with the last note before it
export function notedLines(uses: Use[], notes: {height: number; extrinsic: string}[]): NotedLine[] {
    const paired = uses.map(({at, ...referendum}) => ({referendum, extrinsic: notes.findLast(n => n.height <= at)?.extrinsic}))
    const taken = new Set(paired.map(p => p.extrinsic))
    return [...paired, ...notes.filter(n => !taken.has(n.extrinsic)).map(n => ({extrinsic: n.extrinsic}))]
}

async function firstNoted(hash: string, notes: {extrinsic: string}[]) {
    if (notes.length === 0) return null
    const calls = await preimageNoteCalls(notes[0].extrinsic)
    const call = calls.find(c => blake2_256(hexToBytes(c.bytes.slice(2))) === hash)
    return call ? describeNotedBytes(call) : null
}

// a preimage call names only a hash, what it stands for lies with the call that noted it
async function markNoted(nodes: (ArgNode | null)[]): Promise<void> {
    const found = nodesOf(nodes, 'hex').filter(n => n.noted)
    if (found.length === 0) return
    const hashes = [...new Set(found.map(n => n.hex))]
    const hit = await preimagesByHash(hashes)
    const noted = await Promise.all(
        hashes.map(async hash => {
            const notes = await preimageNotes(hash)
            return [hash, {lines: notedLines(preimageUses(hit, hash), notes), content: await firstNoted(hash, notes)}] as const
        })
    )
    const byHash = new Map(noted)
    for (const node of found) node.noted = byHash.get(node.hex)
}

// an account carries its identity, so it reads by name the way the signer does
async function markIdentities(nodes: (ArgNode | null)[]): Promise<void> {
    const found = nodesOf(nodes, 'account')
    if (found.length === 0) return
    const {accounts} = await accountRefs([...new Set(found.map(n => n.id))])
    const known = new Map(accounts.map(a => [a.id, a]))
    for (const node of found) node.acc = known.get(node.id)
}

const unique = <T>(values: T[]) => [...new Set(values)]

// a number the index can name carries that name, a title or a registrar's account
async function markTitles(nodes: (ArgNode | null)[]): Promise<void> {
    const referenda = nodesOf(nodes, 'referendum')
    const bounties = nodesOf(nodes, 'bounty')
    const spends = nodesOf(nodes, 'spend')
    const registrars = nodesOf(nodes, 'registrar')
    if (referenda.length + bounties.length + spends.length + registrars.length === 0) return
    const found = await indexTitles({
        referenda: unique(referenda.map(n => n.index)),
        bounties: unique(bounties.map(n => n.index)),
        spends: unique(spends.map(n => n.id)),
        registrars: unique(registrars.map(n => n.index)),
    })
    const titles = new Map(found.referendums.map(r => [r.index, r.title]))
    const descriptions = new Map(found.bounties.map(b => [b.index, b.description]))
    const sources = new Map(found.treasurySpends.map(s => [s.id, s.referendum]))
    const accounts = new Map(found.registrars.map(r => [r.index, r.account]))
    for (const node of referenda) node.title = titles.get(node.index)
    for (const node of bounties) node.title = descriptions.get(node.index)
    for (const node of spends) node.referendum = sources.get(node.id)
    for (const node of registrars) node.account = accounts.get(node.index)
}

/** Fills in what the index knows about the accounts, hashes and indices in a set of args. */
export async function markArgs(nodes: (ArgNode | null)[]): Promise<void> {
    await Promise.all([markPreimages(nodes), markNoted(nodes), markIdentities(nodes), markTitles(nodes)])
}
