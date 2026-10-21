import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, userEvent, waitFor, within} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {accountTransfers, delegatedFrom, EVERY_PAYOUT, FULL_FIELDS, ME, minedDays, multisigOp, payout, proxyDelays, proxyFor, pureCreatedBy, SIGNATORIES, subject, SUBJECT, SUBJECT_EVM, subUnder, TREASURY, validatorRow} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, HEAD, identity, PEOPLE} from '../../../../../mock/fixtures.js'
import {AVATAR_HOST, avatars} from '../../../../.storybook/avatar'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, build, story, AURORA, named, mapped, heading, addressLine, badges, roles, staked} from './page.stories.helpers'

export default {title: 'Pages/Account/Header', ...pageMeta(AccountPage), decorators: [wellKnown]}

const headerOf = (root: HTMLElement) => within(root).getByRole('heading', {level: 1}).parentElement!.parentElement!

export const IdentityNone: StoryObj = {
    ...story({transfers: accountTransfers(5)}),
    play: async ({canvasElement}) => expect(heading(canvasElement)).toBe('Account'),
}

export const IdentityFull: StoryObj = {
    ...story({account: named(identity('Aurora Labs', FULL_FIELDS)), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => {
        expect(heading(canvasElement)).toBe('Aurora Labs')
        expect(within(headerOf(canvasElement)).getByRole('button', {name: 'Bio'})).toBeVisible()
    },
}

const BIOGRAPHED = {...AURORA, bio: 'Validator operator since genesis.\n## Votes\n- **Root** and Treasurer tracks'}

// the header carries the first line of the bio, the rest opens behind its button
export const IdentityBio: StoryObj = {
    ...story({account: named(identity('Aurora Labs', BIOGRAPHED)), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => {
        const header = headerOf(canvasElement)
        expect(within(header).getByText('Validator operator since genesis.')).toBeVisible()
        await userEvent.click(within(header).getByRole('button', {name: 'Bio'}))
        expect(within(await screen.findByRole('dialog')).getByRole('heading', {name: 'Votes'})).toBeInTheDocument()
    },
}

const PICTURED = {...AURORA, avatar: `${AVATAR_HOST}/aurora.png`}

// the header leads with the avatar and swaps to the identicon on a click
export const IdentityAvatar: StoryObj = {
    ...pageStory(build({account: named(identity('Aurora Labs', PICTURED)), transfers: accountTransfers(3)}), {params: {id: SUBJECT}, msw: [avatars]}),
    play: async ({canvasElement}) => {
        const header = within(canvasElement).getByRole('heading', {level: 1}).parentElement!.parentElement!.parentElement!
        await userEvent.click(await within(header).findByRole('button', {name: 'Show identicon'}))
        expect(within(header).getByRole('button', {name: 'Show avatar'})).toBeInTheDocument()
    },
}

export const IdentityDisplayOnly: StoryObj = {
    ...story({account: named(identity('Aurora Labs')), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(within(headerOf(canvasElement)).queryByRole('button', {name: 'Bio'})).toBeNull(),
}

// a registration with an empty display goes by the account's username
export const DisplayEmptyUsername: StoryObj = {
    ...story({account: named({...identity(null, AURORA), username: 'aurora.numen'}), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(heading(canvasElement)).toBe('aurora.numen'),
}

export const UsernameOnly: StoryObj = {
    ...story({account: subject({username: 'aurora.numen'}), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => {
        expect(heading(canvasElement)).toBe('aurora.numen')
        expect(addressLine(canvasElement)).toBe(`aurora.numen|${ss58Encode(SUBJECT, chainInfo.ss58)}`)
    },
}

// a sub with no registration of its own goes by its super's name and its own
export const SubIdentity: StoryObj = {
    ...story({account: subject(subUnder(PEOPLE[0], 'payouts')), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(heading(canvasElement)).toBe('Polaris Guild/payouts'),
}

// each badge's text and tone in the order the header shows them
const badgeTones = (root: HTMLElement) => badges(root).map(b => [b.textContent, b.dataset.variant])
const tones = (root: HTMLElement) => Object.fromEntries(badgeTones(root))

// the treasury account wearing every other role as well, in the order the page adds them
export const EveryRole: StoryObj = {
    ...story({
        account: subject({id: TREASURY.id, evmAddress: SUBJECT_EVM}),
        prime: true,
        validator: validatorRow(),
        minerDays: minedDays(30),
        registrar: 2,
        deploys: 5,
        tokens: 3,
        payouts: EVERY_PAYOUT,
        curated: 1,
        delegationsIn: delegatedFrom(3),
        multisigOps: [multisigOp(0, {multisig: TREASURY, approvals: SIGNATORIES.slice(1, 3), signatories: SIGNATORIES, threshold: 3})],
        proxiesIn: proxyFor(2),
        pure: pureCreatedBy(PEOPLE[0], HEAD - 9_000),
        proxiesOut: proxyDelays(PEOPLE[1], 'Governance', [100]),
    }),
    play: async ({canvasElement}) =>
        expect(badgeTones(canvasElement)).toEqual([
            ['Treasury', 'primary'],
            ['Prime', 'warn'],
            ['Active validator', 'pos'],
            ['Miner', 'primary'],
            ['Registrar #2', 'primary'],
            ['Token issuer · 3', 'primary'],
            ['Contract deployer', 'idle'],
            ['Treasury beneficiary', 'idle'],
            ['Bounty curator', 'idle'],
            ['Delegate', 'idle'],
            ['Multisig 3/5', 'idle'],
            ['Proxy', 'idle'],
            ['Pure proxy', 'idle'],
            ['Has proxies', 'idle'],
        ]),
}

// a validator outside the active set wears the plain grey badge
export const ValidatorInactive: StoryObj = {
    ...story({account: staked(), validator: validatorRow({active: false})}),
    play: async ({canvasElement}) => expect(tones(canvasElement)).toEqual({Validator: 'idle'}),
}

// the roles an account earns from the contracts and tokens it deployed
const deployed = (contracts: number, tokens: number, earned: string[]): StoryObj => ({
    ...story({account: mapped(), deploys: contracts, tokens}),
    play: async ({canvasElement}) => expect(roles(canvasElement)).toEqual(earned),
})

export const DeployedNothing = deployed(0, 0, [])

export const DeployedContractsOnly = deployed(3, 0, ['Contract deployer'])

export const DeployedOneToken = deployed(1, 1, ['Token issuer'])

export const DeployedManyTokens = deployed(150, 150, ['Token issuer · 150'])

export const DeployedMoreContractsThanTokens = deployed(160, 150, ['Token issuer · 150', 'Contract deployer'])

// spawned by Polaris Guild at #991,000, which kept an Any proxy on it, and the badge's tip says so
export const PureProxy: StoryObj = {
    ...story({pure: pureCreatedBy(PEOPLE[0], HEAD - 9_000), proxiesOut: proxyDelays(PEOPLE[0], 'Any', [0]), refs: [PEOPLE[0]], transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => {
        const badge = badges(canvasElement).find(b => b.textContent === 'Pure proxy')!
        expect(badge.dataset.variant).toBe('idle')
        await userEvent.hover(badge)
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Created by Polaris Guild at #991,000')
    },
}

// an Any proxy with no delay can take over at once, so the badge warns even beside one that waits
export const ProxiesInstant: StoryObj = {
    ...story({proxiesOut: proxyDelays(PEOPLE[0], 'Any', [0, 14_400]), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(tones(canvasElement)).toEqual({'Has proxies': 'warn'}),
}

// every proxy waits out a delay, so none can take over at once
export const ProxiesDelayed: StoryObj = {
    ...story({proxiesOut: proxyDelays(PEOPLE[0], 'Any', [100, 14_400]), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(tones(canvasElement)).toEqual({'Has proxies': 'idle'}),
}

const multisigSelf = (threshold: number, signatories: string[]): StoryObj => ({
    ...story({multisigOps: [multisigOp(0, {multisig: ME, approvals: signatories.slice(1, 3), signatories, threshold})], refs: PEOPLE.slice(0, 3), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(tones(canvasElement)).toEqual({[`Multisig ${threshold}/${signatories.length}`]: threshold === 1 || threshold === signatories.length ? 'warn' : 'idle'}),
})

export const MultisigTwoOfThree = multisigSelf(2, PEOPLE.slice(0, 3).map(p => p.id))

export const MultisigOneOfTwo = multisigSelf(1, PEOPLE.slice(0, 2).map(p => p.id))

export const MultisigThreeOfThree = multisigSelf(3, PEOPLE.slice(0, 3).map(p => p.id))

// curator fees alone earn no Treasury beneficiary badge
export const CuratorFeesOnly: StoryObj = {
    ...story({payouts: [payout(0, 'Bounty', 'Curator', 380, {bounty: {index: 3, description: 'Wallet audit', referendum: null}})]}),
    play: async ({canvasElement}) => expect(roles(canvasElement)).toEqual([]),
}

// with no username the code card shows the address alone
export const QrCode: StoryObj = {
    ...story({transfers: accountTransfers(3)}),
    play: async ({canvas, userEvent}) => {
        const addr = ss58Encode(SUBJECT, chainInfo.ss58)
        await userEvent.click(canvas.getByRole('button', {name: 'QR code'}))
        const popover = await within(document.body).findByRole('dialog')
        await waitFor(() => expect(within(popover).getByRole('img', {name: `QR code for ${addr}`})).toBeVisible())
        await expect(within(popover).getByRole('button', {name: 'Save PNG'})).toBeVisible()
        expect(popover.textContent).toBe(`${addr}Save PNG`)
    },
}

export const QrCodeWithUsername: StoryObj = {
    ...story({account: subject({username: 'aurora.numen'}), transfers: accountTransfers(3)}),
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'QR code'}))
        const popover = await within(document.body).findByRole('dialog')
        await waitFor(() => expect(within(popover).getByText('aurora.numen')).toBeVisible())
        expect(within(popover).getByRole('img', {name: `QR code for ${ss58Encode(SUBJECT, chainInfo.ss58)}`})).toBeVisible()
    },
}
