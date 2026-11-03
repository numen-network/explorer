import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {columnTexts} from '../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../.storybook/page'
import ValidatorsPage from './page'
import {chainInfo} from '../../../../mock/fixtures.js'
import {running, session, sessions} from './page.stories.helpers'

export default {title: 'Pages/Validators/Sessions', ...pageMeta(ValidatorsPage)}

export const Empty = sessions([])

// the head sits on the 41st of its session's 60 blocks
export const One: StoryObj = {
    ...sessions([running()]),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'ID')).toEqual(['#16,666'])
        await expect(columnTexts(canvasElement, 'Block Begin')).toEqual(['#999,960'])
        await expect(columnTexts(canvasElement, 'Block End')).toEqual([expect.stringMatching(/41 \/ 60$/)])
    },
}

// a batch past the head the page renders at already closed the running session,
// which still shows how far it had got at the head
export const EndPastHead: StoryObj = {
    ...sessions([running({endBlock: 1_000_019})]),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Block End')).toEqual([expect.stringMatching(/41 \/ 60$/)])
    },
}

// mainnet around the first kicks, a heartbeat missed in 4875 and two in 4876,
// each session kicking one validator as it ended
export const Mainnet: StoryObj = {
    ...sessions([
        running(),
        session(4_876, {timestamp: '2026-10-17T18:01:32.081Z', offline: 2, kicked: 1}),
        session(4_875, {timestamp: '2026-10-17T17:51:48.920Z', offline: 1, kicked: 1}),
        session(4_874, {timestamp: '2026-10-17T17:42:30.795Z'}),
    ]),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Block End')).toEqual([expect.stringMatching(/41 \/ 60$/), '#292,619', '#292,559', '#292,499'])
        await expect(columnTexts(canvasElement, /^Offline/)).toEqual(['0', '2', '1', '0'])
        await expect(columnTexts(canvasElement, /^Equivocations/)).toEqual(['0', '0', '0', '0'])
        await expect(columnTexts(canvasElement, /^Kicked/)).toEqual(['0', '1', '1', '0'])
    },
}

// an equivocation is reported mid-session, the kick waits for the session to end
export const EquivocationReported: StoryObj = {
    ...sessions([running({equivocations: 1}), session(16_665)]),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, /^Equivocations/)).toEqual(['1', '0'])
        await expect(columnTexts(canvasElement, /^Kicked/)).toEqual(['0', '0'])
    },
}

const genesis = [session(1), session(0, {timestamp: null})]

// genesis carries no timestamp, so its session takes the config's genesis time
export const GenesisSession: StoryObj = {
    ...sessions(genesis),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Block Begin')).toEqual(['#60', '#0'])
        await expect(columnTexts(canvasElement, /^Age/).at(-1)).toContain('| 2026-09-14 01:00:00')
    },
}

// a network with no genesis time in the config, like the testnet, shows the empty mark
export const GenesisSessionUnconfigured: StoryObj = {
    ...sessions(genesis, {}, {chainInfos: [{...chainInfo, evmChainId: 320261}]}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, /^Age/).at(-1)).toBe('—'),
}

const many = [running(), ...Array.from({length: 44}, (_, i) => session(16_665 - i, i % 9 === 4 ? {offline: 1} : {}))]

export const Many = sessions(many)

export const LastPage = sessions(many, {page: lastPage(many.length)})
