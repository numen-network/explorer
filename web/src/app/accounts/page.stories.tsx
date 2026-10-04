import type {Decorator, StoryObj} from '@storybook/nextjs-vite'
import {expect, screen} from 'storybook/test'
import {WellKnownProvider} from '@/components/wellKnown'
import {ss58Encode} from '@/lib/ss58'
import {MAX_U128, PLANCK, PRIME_KEY, TREASURY} from '../../../../mock/fixtures/accounts.js'
import {acct, chainInfo, HEAD, identity, issuance, numn, PEOPLE} from '../../../../mock/fixtures.js'
import {expectAddressForm, expectFits, PHONE} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import AccountsPage from './page'

const wellKnown: Decorator = Story => (
    <WellKnownProvider treasury={ss58Encode(chainInfo.treasuryAccount, chainInfo.ss58)} prime={ss58Encode(PRIME_KEY.id, chainInfo.ss58)} evmChainId={chainInfo.evmChainId}>
        <Story />
    </WellKnownProvider>
)

export default {title: 'Pages/Accounts', ...pageMeta(AccountsPage), decorators: [wellKnown]}

const row = (who: object, balance: string, i: number) => ({...who, balance, nonce: (i * 37) % 900, firstSeenBlock: 1_000 + i * 41_000, lastActiveBlock: HEAD - i * 1_300})

const list = (rows: object[], {total = rows.length, since = 412_345} = {}) =>
    pageStory({
        accounts: rows,
        accountsConnection: {totalCount: total},
        dailyStats: [{issuanceTotal: issuance.issuanceTotal}],
        primeStates: [{since, account: PRIME_KEY}],
    })

export const Empty = pageStory({})

export const One = list([row(PEOPLE[0], numn(2_400_000), 0)])

// one row per emoji tier of the issuance share, then dust below the last tier and an emptied account
const TIERS: [object, string][] = [
    [TREASURY, issuance.treasuryPot],
    [PRIME_KEY, numn(12_500_000)],
    [PEOPLE[0], numn(2_400_000)],
    [PEOPLE[1], numn(750_000)],
    [PEOPLE[2], numn(310_000)],
    [PEOPLE[3], numn(88_000)],
    [PEOPLE[4], numn(41_000)],
    [PEOPLE[5], numn(12_345.678)],
    [PEOPLE[6], numn(6_100)],
    [PEOPLE[7], numn(4_200)],
    [PEOPLE[8], numn(950.5)],
    [PEOPLE[9], numn(610)],
    [acct(11), numn(420)],
    [acct(12), numn(75.25)],
    [acct(13), numn(61)],
    [acct(14), numn(45)],
    [acct(15), numn(6.5)],
    [acct(16, identity('Dust Collector', {judgements: []})), numn(2.75)],
    [acct(17), numn(0.000001)],
    [acct(18), '0'],
]

export const Many = list(
    TIERS.map(([who, balance], i) => row(who, balance, i)),
    {total: 1_284, since: 0}
)

// what the share tip of the named account reads once its balance is hovered
const shareTip =
    (name: string, share: string): StoryObj['play'] =>
    async ({canvas, userEvent}) => {
        const row = canvas.getByText(name).closest('tr')!
        await userEvent.hover(row.querySelector('td:nth-child(2) [data-slot=tooltip-trigger]')!)
        await expect(await screen.findByRole('tooltip')).toHaveTextContent(`${share} of issuance`)
    }

// a share under a hundredth of a percent reads to six decimals
export const SmallShareHovered: StoryObj = {...Many, play: shareTip('Spamlord', '0.006804%')}

// a balance too thin for the sixth decimal still reads as a share of issuance
export const DustShareHovered: StoryObj = {...Many, play: shareTip('Dust Collector', '<0.000001%')}

// the treasury and prime cards wrap their full addresses, the table keeps 7…4
export const ManyOnPhone: StoryObj = {
    ...Many,
    globals: PHONE,
    play: async ({canvasElement}) => {
        const [cards, table] = canvasElement.querySelectorAll('[data-slot=card]')
        expectFits(cards, table)
        expectAddressForm(cards, 'full')
        expectAddressForm(table, 'short')
    },
}

export const ExtremeNumbers = list([
    {...row(PEOPLE[7], MAX_U128, 0), nonce: 2_147_483_647, firstSeenBlock: 0, lastActiveBlock: HEAD},
    row(PEOPLE[8], numn(0.000001), 1),
    {...row(acct(19), PLANCK, 2), nonce: 0},
    {...row(acct(20), '0', 3), nonce: 0, firstSeenBlock: HEAD, lastActiveBlock: HEAD},
])
