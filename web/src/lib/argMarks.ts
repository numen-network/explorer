import {describeArgs, nodesOf, type ArgNode, type Preimage} from '@/lib/args'
import {accountRefs, indexTitles, preimagesByHash, specVersionAt} from '@/lib/gql'

// a hash the index knows as a referendum text or proposal
async function markPreimages(nodes: (ArgNode | null)[]): Promise<void> {
    const found = nodesOf(nodes, 'hex').filter(n => n.hex.length === 66)
    if (found.length === 0) return
    const {texts, proposals} = await preimagesByHash([...new Set(found.map(n => n.hex))])
    const known = new Map<string, Preimage>()
    for (const t of texts) {
        if (known.has(t.hash)) continue
        known.set(t.hash, {kind: 'text', referendum: t.referendum.index, title: t.title, text: [t.title, t.description].filter(Boolean).join('\n\n')})
    }
    for (const r of proposals) {
        const spec = await specVersionAt(r.submittedAt)
        const call = r.proposalPallet && r.proposalMethod ? describeArgs({pallet: r.proposalPallet, method: r.proposalMethod, args: r.proposalCalls?.[0]?.args, specVersion: spec, nested: false}) : null
        known.set(r.proposalHash, {kind: 'proposal', referendum: r.index, title: r.title, call: call && {kind: 'call', name: `${r.proposalPallet}.${r.proposalMethod}`, args: call}})
    }
    for (const node of found) node.preimage = known.get(node.hex)
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
    await Promise.all([markPreimages(nodes), markIdentities(nodes), markTitles(nodes)])
}
