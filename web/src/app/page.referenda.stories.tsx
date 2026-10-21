import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen} from 'storybook/test'
import {referenda} from '../../../mock/data.js'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {home, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Referenda', ...pageMeta(Home)}

export const TitleHovered: StoryObj = {
    ...pageStory(home(many)),
    play: async ({canvas, userEvent}) => {
        const title = canvas.getByText(/deliberately long title/)
        expect(title.scrollWidth).toBeGreaterThan(title.clientWidth)
        await userEvent.hover(title)
        await expect(await screen.findByRole('tooltip')).toHaveTextContent(title.textContent!)
    },
}

const undecoded = {...referenda[3], id: '12', index: 12, title: null, proposalPallet: null, proposalMethod: null, proposalPayouts: null, proposalAmount: null, proposalBeneficiary: null}

export const Ended = pageStory(home({...many, referendums: [undecoded, referenda[0], referenda[1], referenda[9], referenda[10]]}))
