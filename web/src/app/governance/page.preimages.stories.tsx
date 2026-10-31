import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, spyOn, userEvent, within} from 'storybook/test'
import data from '../../../../mock/data.js'
import {block, HEAD, numn, PEOPLE} from '../../../../mock/fixtures.js'
import {listed} from '../../../../mock/fixtures/governance.js'
import {columnTexts} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import {runtimeAt} from '@/lib/runtime'
import GovernancePage from './page'

export default {title: 'Pages/Governance/Preimages', ...pageMeta(GovernancePage)}

const hashOf = (n: number) => '0x' + n.toString(16).padStart(4, '0').repeat(16)
const REMARK = {pallet: 'System', method: 'remark', address: [], args: {remark: '0x6772616e7473'}}

const REMARK_CALL = {__kind: 'System', value: {__kind: 'remark', remark: '0x6772616e7473'}}
const encoded = (call: unknown) => `0x${Buffer.from(runtimeAt(block(0).specVersion)!.encodeCall(call as never)).toString('hex')}`
const utf8 = (text: string) => `0x${Buffer.from(text).toString('hex')}`
const GRANTS = 'Fund the Q4 developer grants'
const GRANTS_BYTES = utf8(`${GRANTS}\n\nThis proposal pays the Q4 developer grants from the treasury.`)

const preimage = (n: number, traits: object = {}) => ({
    id: `${String(HEAD - n).padStart(10, '0')}-00002-0000${n}`,
    hash: hashOf(n),
    status: 'Unrequested',
    len: 96,
    depositor: PEOPLE[0],
    deposit: numn(5.96),
    notedBlock: HEAD - n,
    clearedBlock: null,
    kind: 'Raw',
    title: null,
    bytes: null as string | null,
    calls: null,
    metadataActions: [],
    referenda: [],
    ...traits,
})

const preimagesTab = (rows: ReturnType<typeof preimage>[]): StoryObj => pageStory({...data, preimages: listed(rows), preimagesConnection: {totalCount: rows.length}}, {searchParams: {tab: 'preimages'}})

export const Empty: StoryObj = {
    ...preimagesTab([]),
    play: async ({canvas}) => expect(canvas.getByText('No preimages yet.')).toBeInTheDocument(),
}

export const One = preimagesTab([preimage(1)])

const text = (index: number, title: string | null = null) => ({referendum: {index, title}})
const called = (index: number, title: string | null = null) => ({index, title})

// each status, each kind, a request nobody noted, and a long first line
const EVERY_CASE = [
    preimage(1, {status: 'Requested', len: null, depositor: null, deposit: null, notedBlock: null, kind: null, referenda: [called(7)]}),
    preimage(2, {status: 'Requested', len: 2148, depositor: null, deposit: null, kind: 'Call', bytes: encoded(REMARK_CALL), calls: [REMARK], referenda: [called(3)]}),
    preimage(3, {kind: 'Text', title: GRANTS, bytes: GRANTS_BYTES, metadataActions: [text(3), text(3), text(4)]}),
    preimage(4, {kind: 'Text', title: 'A first line long enough that the cell has to cut it short', bytes: utf8('A first line long enough that the cell has to cut it short')}),
    preimage(5, {status: 'Cleared', clearedBlock: HEAD - 1, kind: 'Raw', bytes: '0x00ff10'}),
]

export const EveryCase: StoryObj = {
    ...preimagesTab(EVERY_CASE),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Status')).toEqual(['Requested', 'Requested', 'Unrequested', 'Unrequested', 'Cleared'])
        expect(columnTexts(canvasElement, 'Type')).toEqual(['—', 'Call', 'Text', 'Text', 'Raw'])
        expect(columnTexts(canvasElement, 'Content').slice(0, 3)).toEqual(['—', 'System.remark', 'Fund the Q4 developer grants'])
        expect(columnTexts(canvasElement, 'Referenda')).toEqual(['#7', '#3', '#3#4', '—', '—'])
        expect(columnTexts(canvasElement, 'Size')).toEqual(['—', '2,148 bytes', '96 bytes', '96 bytes', '96 bytes'])
        expect(columnTexts(canvasElement, 'Depositor').slice(0, 2)).toEqual(['—', '—'])
    },
}

export const ReferenceLinks: StoryObj = {
    ...preimagesTab([preimage(1, {kind: 'Text', metadataActions: [text(4)], referenda: [called(2)]})]),
    play: async ({canvas}) => {
        expect(canvas.getByRole('link', {name: '#4'})).toHaveAttribute('href', '/referendum/4?tab=text')
        expect(canvas.getByRole('link', {name: '#2'})).toHaveAttribute('href', '/referendum/2?tab=call')
    },
}

const LONG_TITLE = 'A referendum title long enough that the popover has to wrap it instead of running past the edge of a phone screen'
const titled = [called(3, 'Fund the Q4 developer grants'), called(4), called(5, LONG_TITLE), called(6, 'Raise the registrar fee'), called(8, 'Whitelist two validators')]
const openList = () => screen.findByRole('dialog')

export const ReferenceCounts: StoryObj = {
    ...preimagesTab([preimage(1, {referenda: titled.slice(0, 1)}), preimage(2, {referenda: titled.slice(0, 2)}), preimage(3, {referenda: titled})]),
    play: async ({canvas, canvasElement}) => {
        expect(columnTexts(canvasElement, 'Referenda')).toEqual(['#3', '#3#4', '#3#4+3'])
        expect(canvas.getAllByRole('button', {name: 'All referenda'})).toHaveLength(3)
    },
}

export const AllReferencesWithTitles: StoryObj = {
    ...preimagesTab([preimage(1, {kind: 'Call', calls: [REMARK], referenda: titled})]),
    play: async ({canvas}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'All referenda'}))
        const links = within(await openList()).getAllByRole('link')
        expect(links.map(a => a.textContent)).toEqual(['#3 · Fund the Q4 developer grants', '#4', `#5 · ${LONG_TITLE}`, '#6 · Raise the registrar fee', '#8 · Whitelist two validators'])
        expect(links[0]).toHaveAttribute('href', '/referendum/3?tab=call')
        expect((await openList()).getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
        expect(canvas.queryByText('remark')).not.toBeInTheDocument()
    },
}

export const HoverOpensReferences: StoryObj = {
    ...preimagesTab([preimage(1, {referenda: titled})]),
    play: async ({canvas}) => {
        await userEvent.hover(canvas.getByRole('button', {name: 'All referenda'}))
        expect(await openList()).toBeInTheDocument()
    },
}

export const HoverNumberOpensReferences: StoryObj = {
    ...preimagesTab([preimage(1, {referenda: titled})]),
    play: async ({canvas}) => {
        await userEvent.hover(canvas.getByRole('link', {name: '#3'}))
        expect(await openList()).toBeInTheDocument()
    },
}

export const CopyHash: StoryObj = {
    ...preimagesTab([preimage(1, {kind: 'Raw', bytes: '0x00ff10'})]),
    play: async ({canvas}) => {
        const write = spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
        await userEvent.click(canvas.getByRole('button', {name: 'copy'}))
        expect(write).toHaveBeenCalledWith(hashOf(1))
        expect(canvas.queryByText('bytes')).not.toBeInTheDocument()
        write.mockRestore()
    },
}

const BATCH = [
    {pallet: 'Utility', method: 'batch_all', address: [], args: {calls: [REMARK_CALL]}},
    {...REMARK, address: [0]},
]

const expandFirst = (canvas: {getAllByRole: (role: string, options: {name: string}) => HTMLElement[]}) => userEvent.click(canvas.getAllByRole('button', {name: 'expand'})[0])

export const ExpandedBatch: StoryObj = {
    ...preimagesTab([preimage(1, {kind: 'Call', bytes: encoded({__kind: 'Utility', value: {__kind: 'batch_all', calls: [REMARK_CALL, REMARK_CALL]}}), calls: BATCH}), preimage(2)]),
    play: async ({canvas}) => {
        expect(canvas.getAllByRole('button', {name: 'expand'})).toHaveLength(1)
        await expandFirst(canvas)
        expect(canvas.getByText('bytes')).toBeVisible()
        expect(canvas.getAllByText('Utility.batch_all')).toHaveLength(2)
        expect(canvas.getByText('2 calls')).toBeVisible()
        expect(canvas.getAllByText('System.remark')).toHaveLength(2)
    },
}

export const ExpandedText: StoryObj = {
    ...preimagesTab([preimage(1, {kind: 'Text', title: GRANTS, bytes: GRANTS_BYTES})]),
    play: async ({canvas}) => {
        await expandFirst(canvas)
        expect(canvas.getByText('bytes')).toBeVisible()
        expect(canvas.getByText(/UTF-8/)).toBeVisible()
        expect(canvas.getByRole('button', {name: 'View'})).toBeVisible()
    },
}

export const ExpandedRaw: StoryObj = {
    ...preimagesTab([preimage(1, {kind: 'Raw', bytes: '0x00ff10'})]),
    play: async ({canvas}) => {
        await expandFirst(canvas)
        expect(canvas.getByText('bytes')).toBeVisible()
        expect(canvas.getByText('0x00ff10 (3 bytes)')).toBeVisible()
    },
}

export const ViewTextFromContent: StoryObj = {
    ...preimagesTab([preimage(1, {kind: 'Text', title: GRANTS, bytes: GRANTS_BYTES})]),
    play: async ({canvas}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'View text'}))
        expect(within(await screen.findByRole('dialog')).getByText(/pays the Q4 developer grants/)).toBeInTheDocument()
        expect(canvas.queryByText('bytes')).not.toBeInTheDocument()
    },
}

export const DownloadBytes: StoryObj = {
    ...preimagesTab([preimage(1, {kind: 'Raw', bytes: '0x00ff10'}), preimage(2)]),
    play: async ({canvas}) => {
        const [link] = canvas.getAllByRole('link', {name: 'download'})
        expect(canvas.getAllByRole('link', {name: 'download'})).toHaveLength(1)
        expect(link.getAttribute('href')).toBe(`/api/bytes?preimage=${preimage(1).id}&hash=${hashOf(1)}`)
    },
}

export const Many = preimagesTab(Array.from({length: 40}, (_, i) => preimage(i + 1)))
