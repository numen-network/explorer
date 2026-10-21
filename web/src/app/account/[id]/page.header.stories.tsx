import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, userEvent, waitFor, within} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {accountTransfers, delegatedFrom, EVERY_PAYOUT, FULL_FIELDS, funds, ME, minedDays, multisigOp, proxyDelays, proxyFor, pureCreatedBy, SIGNATORIES, subject, SUBJECT, SUBJECT_EVM, validatorRow} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, HEAD, identity, numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {expectWholeWords} from '../../../../.storybook/fit'
import {AVATAR_HOST, avatars} from '../../../../.storybook/avatar'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, build, story, IDENTITY_DEPOSIT, AURORA, named, mapped, lock, heading, addressLine, badges, roles} from './page.stories.helpers'

export default {title: 'Pages/Account/Header', ...pageMeta(AccountPage), decorators: [wellKnown]}

const headerOf = (root: HTMLElement) => within(root).getByRole('heading', {level: 1}).parentElement!.parentElement!

export const IdentityNone: StoryObj = {
    ...story({transfers: accountTransfers(5)}),
    play: async ({canvasElement}) => expect(heading(canvasElement)).toBe('Account'),
}

// a valid address the index has never seen
export const NotActivated: StoryObj = {
    ...pageStory({...build({}), accountById: null}, {params: {id: SUBJECT}}),
    play: async ({canvas, canvasElement}) => {
        expect(heading(canvasElement)).toBe('Account')
        expect(canvas.getByText('Not activated')).toBeVisible()
        expect(canvas.queryByRole('navigation', {name: 'Account'})).toBeNull()
    },
}

export const IdentityFull: StoryObj = {
    ...story({account: named(identity('Aurora Labs', FULL_FIELDS)), transfers: accountTransfers(3)}, {tab: 'direct'}),
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
    ...story({account: named(identity('Aurora Labs')), transfers: accountTransfers(3)}, {tab: 'direct'}),
    play: async ({canvasElement}) => expect(within(headerOf(canvasElement)).queryByRole('button', {name: 'Bio'})).toBeNull(),
}

export const UsernameOnly: StoryObj = {
    ...story({account: subject({username: 'aurora.numen'}), transfers: accountTransfers(3)}),
    play: async ({canvas, canvasElement}) => {
        expect(heading(canvasElement)).toBe('aurora.numen')
        expect(addressLine(canvasElement)).toBe(`aurora.numen|${ss58Encode(SUBJECT, chainInfo.ss58)}`)
        expect(canvas.queryByText('Identity')).toBeNull()
    },
}

// the H160 leaves its note little room on the line, which wraps it between
// whole words
export const EveryRole: StoryObj = {
    ...story({
        account: named({evmAddress: SUBJECT_EVM, ...funds(numn(100_250_000), IDENTITY_DEPOSIT, numn(100_000_000)), locksJson: [lock('validatr', numn(100_000_000))]}),
        prime: true,
        validator: validatorRow(),
        minerDays: minedDays(30),
        registrar: 2,
        deploys: 5,
        tokens: 3,
        curated: 1,
        delegationsIn: delegatedFrom(3),
        multisigOps: [multisigOp(0, {multisig: ME, approvals: SIGNATORIES.slice(1, 3), signatories: SIGNATORIES, threshold: 3})],
        proxiesIn: proxyFor(2),
        transfers: accountTransfers(4),
        payouts: EVERY_PAYOUT,
    }),
    play: async ({canvas}) => expectWholeWords(await canvas.findByText('mapped account of this H160')),
}

const tones = (root: HTMLElement) => Object.fromEntries(badges(root).map(b => [b.textContent, b.dataset.variant]))

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

// spawned by Polaris Guild, which kept an Any proxy with no delay, beside a Governance proxy that waits 100 blocks
export const PureProxy: StoryObj = {
    ...story({
        pure: pureCreatedBy(PEOPLE[0], HEAD - 9_000),
        proxiesOut: [...proxyDelays(PEOPLE[0], 'Any', [0]), ...proxyDelays(PEOPLE[1], 'Governance', [100])],
        refs: [PEOPLE[0]],
        transfers: accountTransfers(3),
    }),
    play: async ({canvasElement}) => expect(tones(canvasElement)).toEqual({'Pure proxy': 'idle', 'Has proxies': 'warn'}),
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

export const QrCode: StoryObj = {
    ...story({transfers: accountTransfers(3)}),
    play: async ({canvas, canvasElement, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'QR code'}))
        const body = within(document.body)
        const code = await body.findByRole('img', {name: `QR code for ${ss58Encode(SUBJECT, chainInfo.ss58)}`})
        await waitFor(() => expect(code).toBeVisible())
        await expect(body.getByRole('button', {name: 'Save PNG'})).toBeVisible()
        expect(addressLine(canvasElement)).toBe(ss58Encode(SUBJECT, chainInfo.ss58))
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
