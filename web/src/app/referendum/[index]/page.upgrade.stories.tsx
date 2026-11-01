import {expect, within} from 'storybook/test'
import {block, HEAD} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import {specVersionsJsonl} from '@/lib/specVersions'
import ReferendumPage from './page'
import {curated, story, withPlay, type Referendum} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Upgrade', ...pageMeta(ReferendumPage)}

const CODE_HASH = '0x4b2de8bf7b0bcaf5f7602da227f713c225a173a6e8ea67dab35ece191a7dacb0'
const INSTALLED_HASH = '0x9a1c6be0d74f3e2215ac08b7f6d1e3a94c2b7d605e18fa3c7b90d2164e8a5f31'

const runtimeCode = (specVersion: number) => {
    const {specName, metadata} = specVersionsJsonl()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .find(v => v.specVersion === specVersion)
    return {id: CODE_HASH, specName, specVersion, implVersion: 1, transactionVersion: 1, metadata}
}

const upgrade = (proposalRuntime: object, title: string): Referendum => ({...curated(2), id: '20', index: 20, title, proposalPallet: 'Prime', proposalMethod: 'upgrade', proposalRuntime})

// the head runs replaced, and an approved referendum installed it when installer is set
const against = (r: Referendum, replaced: number, installer?: number) =>
    story(r, 'upgrade', {
        blocks: (args: {where?: {height_eq?: number}}) => (args.where?.height_eq != null ? [block(args.where.height_eq)] : [{height: HEAD, timestamp: new Date().toISOString(), specVersion: replaced}]),
        referendums: (args: {where?: {index_eq?: number}}) => (args.where?.index_eq != null ? [r] : installer != null ? [{index: installer, proposalRuntime: {id: INSTALLED_HASH}}] : []),
    })

const row = (root: HTMLElement, name: string) => within(within(root).getByText(name).closest('tr')!)

export const NewPallet = withPlay(against(upgrade(runtimeCode(10100), 'Runtime v10100'), 10000), async ({canvasElement}) => {
    const genesis = row(canvasElement, 'GenesisRegistrars')
    await expect(genesis.getByText('Added')).toBeVisible()
    await expect(genesis.getByText('0')).toBeVisible()
    await expect(row(canvasElement, 'Spec version').getByText('10100')).toBeVisible()
    await expect(within(canvasElement).getAllByText('No changes')).toHaveLength(2)
    await expect(within(canvasElement).getByText('Interface changes only')).toBeVisible()
})

export const ConstantsAndCalls = withPlay(against(upgrade(runtimeCode(10000), 'Runtime v10000'), 100), async ({canvasElement}) => {
    const deposit = row(canvasElement, 'Balances.ExistentialDeposit')
    await expect(deposit.getByText('0.000001 NUMN')).toBeVisible()
    await expect(deposit.getByText('0 NUMN')).toBeVisible()
    await expect(deposit.getByText('The minimum amount required to keep an account open.')).toBeVisible()
    await expect(row(canvasElement, 'Identity.remove_registrar').getByText('Added')).toBeVisible()
    await expect(row(canvasElement, 'Prime.remove_registrar').getByText('Removed')).toBeVisible()
    await expect(within(canvasElement).queryByText('System.Version')).toBeNull()
})

export const InstalledByReferendum = withPlay(against(upgrade(runtimeCode(10100), 'Runtime v10100'), 10000, 7), async ({canvasElement}) => {
    await expect(row(canvasElement, 'Spec version').getByRole('link', {name: /#7/})).toHaveAttribute('href', '/referendum/7')
    await expect(row(canvasElement, 'Code hash').getAllByRole('button')).toHaveLength(2)
})

export const NotARuntime = withPlay(against(upgrade({id: CODE_HASH, specName: null, specVersion: null, implVersion: null, transactionVersion: null, metadata: null}, 'Upgrade with bytes that do not run'), 10000), async ({canvasElement}) => {
    await expect(row(canvasElement, 'Spec version').getByText('Null')).toBeVisible()
    await expect(within(canvasElement).queryByText('Constants')).toBeNull()
})

export const NoUpgradeTab = withPlay(story(curated(2), 'upgrade'), async ({canvasElement}) => {
    await expect(within(canvasElement).queryByRole('link', {name: 'Upgrade'})).toBeNull()
})
