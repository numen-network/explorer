import {expect, within} from 'storybook/test'
import {numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {standard} from '../../../../../mock/fixtures/governance.js'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {curated, curatedCase, cast, withPlay, deciding, extremeAmounts} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Tally', ...pageMeta(ReferendumPage)}

// the aye tally ends exactly on the last digit the card shows
export const Confirming = withPlay(curatedCase(6), async ({canvas}) => {
    const tally = within(canvas.getByText('Tally').closest<HTMLElement>('[data-slot=card]')!)
    await expect(tally.getByText('5.1M NUMN')).toBeInTheDocument()
})

// the queries bound to the card under a title
const card = (root: HTMLElement, title: string) => within(within(root).getByText(title).closest<HTMLElement>('[data-slot=card]')!)

// a single planck of nay against 52M of aye keeps the aye share under 100%
export const ExtremeAmounts = withPlay(extremeAmounts('call'), async ({canvasElement}) => {
    for (const figure of ['99.99%', '<0.01%']) await expect(card(canvasElement, 'Tally').getByText(figure)).toBeInTheDocument()
})

// four nay votes against 9,996 aye votes, support a sliver of active issuance,
// and prepare and confirm periods that stop between whole units of time
export const NearlyAllAyeOnUnevenTrack = withPlay(
    cast(
        {...deciding(23, 'Nearly every vote aye on a track with uneven periods'), track: {...(curated(5).track as object), preparePeriod: 540, confirmPeriod: 36_000}},
        [
            {...standard(PEOPLE[0], true, 'Locked6x', numn(1_666)), block: 952_000},
            {...standard(PEOPLE[1], false, 'Locked1x', numn(4)), block: 953_000},
        ],
        'curves'
    ),
    async ({canvasElement}) => {
        for (const figure of ['99.96%', '0.04%', '<0.01%']) await expect(card(canvasElement, 'Tally').getByText(figure)).toBeInTheDocument()
        for (const span of ['1h 30m', '28d', '4d 4h', '1d']) await expect(card(canvasElement, 'Status').getByText(span)).toBeInTheDocument()
    }
)
