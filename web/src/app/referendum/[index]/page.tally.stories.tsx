import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {GENESIS_HASH, HEAD, numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {standard} from '../../../../../mock/fixtures/governance.js'
import {CONFIG} from '@/lib/config'
import {WALLET_URL} from '@/lib/wallet'
import {discussions} from '../../../../.storybook/discussions'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {card, curated, curatedCase, cast, story, withPlay, deciding, extremeAmounts} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Tally', ...pageMeta(ReferendumPage)}

// the aye tally ends exactly on the last digit the card shows, so it reads without ≈
export const ExactAyeTally = withPlay(curatedCase(6), async ({canvasElement}) => {
    await expect(card(canvasElement, 'Tally').getByText('5.1M NUMN').textContent).toBe('5.1M NUMN')
})

// a single planck of nay against 52M of aye keeps the aye share under 100%
export const ExtremeAmounts = withPlay(extremeAmounts('call'), async ({canvasElement}) => {
    for (const figure of ['99.99%', '<0.01%']) await expect(card(canvasElement, 'Tally').getByText(figure)).toBeInTheDocument()
})

// four nay votes against 9,996 aye votes, support a sliver of active issuance
export const NearlyAllAye = withPlay(
    cast(
        deciding(23, 'Nearly every vote aye'),
        [
            {...standard(PEOPLE[0], true, 'Locked6x', numn(1_666)), block: 952_000},
            {...standard(PEOPLE[1], false, 'Locked1x', numn(4)), block: 953_000},
        ],
        'curves'
    ),
    async ({canvasElement}) => {
        for (const figure of ['99.96%', '0.04%', '<0.01%']) await expect(card(canvasElement, 'Tally').getByText(figure)).toBeInTheDocument()
    }
)

// a running referendum links to its ballot in the wallet and to Discord
export const VoteAndDiscuss = withPlay(curatedCase(5), async ({canvasElement}) => {
    const page = within(canvasElement)
    await expect(page.getByRole('link', {name: 'Vote'})).toHaveAttribute('href', `${WALLET_URL}/?vote=5&genesis=${GENESIS_HASH}`)
    await expect(page.getByRole('link', {name: 'Discuss'})).toHaveAttribute('href', CONFIG.socials.discord)
})

// an approved referendum takes no more votes, so only the discussion is left
export const DiscussOnly = withPlay(curatedCase(0), async ({canvasElement}) => {
    const page = within(canvasElement)
    await expect(page.queryByRole('link', {name: 'Vote'})).toBeNull()
    await expect(page.getByRole('link', {name: 'Discuss'})).toHaveAttribute('href', CONFIG.socials.discord)
})

// Gov Bot's thread links in front of the empty map every page story starts with
const withThreads = (s: StoryObj, links: Record<string, string>): StoryObj => ({
    ...s,
    parameters: {...s.parameters, msw: [discussions(links), ...(s.parameters?.msw ?? [])]},
})

// a referendum Gov Bot opened a thread for sends the discussion straight there
export const DiscussThread = withPlay(withThreads(curatedCase(5), {5: 'https://discord.com/channels/999/555'}), async ({canvasElement}) => {
    await expect(within(canvasElement).getByRole('link', {name: 'Discuss'})).toHaveAttribute('href', 'https://discord.com/channels/999/555')
})

// a link that is no Discord thread never makes it onto the page
export const ForeignThreadLink = withPlay(withThreads(curatedCase(5), {5: 'https://evil.test/thread'}), async ({canvasElement}) => {
    await expect(within(canvasElement).getByRole('link', {name: 'Discuss'})).toHaveAttribute('href', CONFIG.socials.discord)
})

// the target each tally row shows after its figure, in the order aye, nay, support
const targets = (root: HTMLElement) => ['Aye', 'Nay', 'Support'].map(label => card(root, 'Tally').getAllByText(label, {exact: false}).at(-1)!.closest('div')!.querySelector('.order-1')?.textContent ?? null)

// a deciding referendum short of both thresholds
export const TargetsDeciding = withPlay(story(curated(5), 'call'), async ({canvasElement}) => {
    await expect(targets(canvasElement)).toEqual(['Need >17.03M', 'Need >312.36K', 'Need >2.03M'])
})

// a confirming referendum, past both thresholds
export const TargetsConfirming = withPlay(story(curated(6), 'call'), async ({canvasElement}) => {
    await expect(targets(canvasElement)).toEqual(['Need >3.16M', 'Need >967.03K', 'Need >1.88M'])
})

// a decision that has just begun demands every vote aye, no amount of aye
// outweighs a nay already cast
export const TargetsAyesOutOfReach = withPlay(story({...curated(5), decidingSince: HEAD}, 'call'), async ({canvasElement}) => {
    await expect(targets(canvasElement)[0]).toBeNull()
})

// an approved referendum has no thresholds left to reach
export const TargetsEnded = withPlay(story(curated(0), 'call'), async ({canvasElement}) => {
    await expect(card(canvasElement, 'Tally').queryByText(/^Need /)).toBeNull()
})

// an ended referendum weighs its support against the issuance of its last tally
export const SupportAtLastTally = withPlay(story({...curated(0), support: numn(250_000), totalIssuance: numn(1_100_000), inactiveIssuance: numn(100_000)}, 'call'), async ({canvasElement}) => {
    const tally = card(canvasElement, 'Tally')
    await expect(tally.getByText('25.00%')).toBeInTheDocument()
    await expect(tally.getByText('Active issuance').nextElementSibling).toHaveTextContent(/^1M NUMN$/)
})

// the aye and nay rows open their list of votes
export const AyeNayLinkToVotes = withPlay(curatedCase(5), async ({canvasElement}) => {
    const tally = card(canvasElement, 'Tally')
    await expect(tally.getByRole('link', {name: /^Aye \(/})).toHaveAttribute('href', '/referendum/5?tab=votes&group=aye')
    await expect(tally.getByRole('link', {name: /^Nay \(/})).toHaveAttribute('href', '/referendum/5?tab=votes&group=nay')
})
