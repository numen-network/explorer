import type {StoryObj} from '@storybook/nextjs-vite'
import {referenda} from '../../../mock/data.js'
import {chainDays} from '../../../mock/fixtures/home.js'
import {numn, transfer} from '../../../mock/fixtures.js'
import {lonePointsPainted, tooltipsInView} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {timeAt, home, minedUpTo, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Daily transactions', ...pageMeta(Home)}

// how much of the day has passed follows the clock, so the two plotted counts are pinned apart
const freshDay = {...chainDays(1_234).at(-1)!, transfers: 12, transferVolume: numn(1_050)}

export const FreshChain: StoryObj = {...pageStory(home({head: 1_234, days: [freshDay], objects: minedUpTo(1_234, 5)})), play: lonePointsPainted}

const firstDay = chainDays(1)[0]

export const FirstBlock: StoryObj = {
    ...pageStory(
        home({
            head: 1,
            days: [{...firstDay, blocks: 2, extrinsicsSigned: 2, transfers: 1, transferVolume: numn(17), cumExtrinsicsSigned: '2', cumTransfers: '1', cumTransferVolume: numn(17), referendaTotal: 1, accountsTotal: 13}],
            objects: minedUpTo(1, 5),
            transfers: [transfer(1, 1, {amount: numn(17), timestamp: timeAt(1, 1)})],
            referendums: [{...referenda[2], id: '0', index: 0, submittedAt: 1, submittedTimestamp: timeAt(1, 1)}],
        })
    ),
    play: lonePointsPainted,
}

export const ChartTooltip: StoryObj = {...pageStory(home(many)), play: tooltipsInView}
