import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {GENESIS_HASH, numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {standard} from '../../../../../mock/fixtures/governance.js'
import {CONFIG} from '@/lib/config'
import {WALLET_URL} from '@/lib/wallet'
import {discussions} from '../../../../.storybook/discussions'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {card, curatedCase, cast, withPlay, deciding, extremeAmounts} from './page.stories.helpers'

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
