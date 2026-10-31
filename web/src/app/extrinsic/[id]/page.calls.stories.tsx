import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {hashOf} from '../../../../../mock/fixtures.js'
import {batchAll, batchInterrupted, batchOfProxies, failedReferendumSubmission, failedVoteRemoval, heartbeat, proxied, referendumSubmission, signedCall, transfer} from '../../../../../mock/fixtures/blocks.js'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import {blake2_256} from '@/lib/hash'
import ExtrinsicPage from './page'
import {of, detail, expectCallRowsFit, payout, wasm} from './page.stories.helpers'

export default {title: 'Pages/Extrinsic/Calls', ...pageMeta(ExtrinsicPage)}

const expandAll: StoryObj['play'] = async ({canvasElement}) => {
    for (const trigger of within(canvasElement).getAllByRole('button', {expanded: false})) await userEvent.click(trigger)
}

// what the call rows show for their outcome, leaving out the extrinsic's own badge above the tabs
const outcomes = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=collapsible-trigger] [data-slot=badge]')].map(badge => badge.textContent)

const notePreimage = (bytes: string) => (height: number) => signedCall(height, 'Preimage.note_preimage', {bytes}, {fee: 104_857_612_000_000_000_000n, events: [['Preimage.Noted', {hash: hashOf('preimage', height)}]]})

const openJson = (canvas: ReturnType<typeof within>) => userEvent.click(canvas.getByRole('tab', {name: 'JSON'}))

const utf8Hex = (text: string) => `0x${[...new TextEncoder().encode(text)].map(b => b.toString(16).padStart(2, '0')).join('')}`

const hexHash = (hex: string) => blake2_256(Uint8Array.from(hex.slice(2).match(/../g) ?? [], byte => parseInt(byte, 16)))

const sent = of(transfer)
type Call = (typeof sent)['calls'][number]

// a single call, open, counts the six events it raised and keeps them inside its row
export const Transfer: StoryObj = {
    ...detail(sent),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('6 events')).toBeVisible()
        expectCallRowsFit(canvasElement)
    },
}

// a call that raised one event counts it in the singular
export const SingleEvent: StoryObj = {...detail(of(heartbeat)), play: async ({canvas}) => expect(canvas.getByText('1 event')).toBeVisible()}

// a failed call that can't fit its badge beside its name moves the badge under it
export const Failed: StoryObj = {...detail(of(failedVoteRemoval)), play: async ({canvasElement}) => expectCallRowsFit(canvasElement)}

export const BatchAll = detail(of(batchAll))

// the failed item and the one past it, which never ran
export const BatchInterrupted: StoryObj = {
    ...detail(of(batchInterrupted)),
    play: async ({canvasElement}) => expect(outcomes(canvasElement)).toEqual(['Failed', 'Not applied']),
}

// a rolled back batch fails at the root and leaves every call under it without an outcome
export const BatchRolledBack: StoryObj = {
    ...detail(of(failedReferendumSubmission)),
    play: async ({canvasElement}) => expect(outcomes(canvasElement)).toEqual(['Failed', 'Not applied', 'Not applied', 'Not applied']),
}

export const ProxyNested = detail(of(proxied))

// a nested call that can't fit its event count beside its name moves the count under it
export const ProxyNestedExpanded: StoryObj = {
    ...detail(of(proxied)),
    play: async context => {
        await expandAll!(context)
        expectCallRowsFit(context.canvasElement)
    },
}

const twoDepths = of(batchOfProxies)

export const TwoDepths = detail(twoDepths)

export const TwoDepthsPage2 = detail(twoDepths, {tab: 'calls', page: '2'})

export const ReferendumSubmissionLongArgs = detail(of(referendumSubmission))

// table and JSON show only the wasm's ends and size
export const RuntimeUpgradePreimage: StoryObj = {
    ...detail(of(notePreimage(wasm))),
    play: async ({canvas, canvasElement}) => {
        const summary = `${wasm.slice(0, 10)}…${wasm.slice(-8)} (1,000,000 bytes)`
        await expect(canvas.getByText(summary)).toBeVisible()
        await expect(canvasElement.textContent).not.toContain(wasm.slice(0, 64))
        await openJson(canvas)
        await expect(canvas.getByText(new RegExp(summary.replace(/[()]/g, '\\$&')))).toBeVisible()
        await expect(canvasElement.textContent).not.toContain(wasm.slice(0, 64))
    },
}

const SHORT_TEXT = utf8Hex('A short preimage')

// a short text preimage shows the same ends and size, never its text
export const NotePreimageText: StoryObj = {
    ...detail(of(notePreimage(SHORT_TEXT))),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText(`${SHORT_TEXT.slice(0, 10)}…${SHORT_TEXT.slice(-8)} (16 bytes)`)).toBeVisible()
        await expect(canvas.getByText(hexHash(SHORT_TEXT))).toBeVisible()
        await expect(canvas.getByRole('link', {name: 'download'})).toBeVisible()
        await expect(canvasElement.textContent).not.toContain('A short preimage')
        await openJson(canvas)
        await expect(canvasElement.textContent).not.toContain(SHORT_TEXT)
    },
}

const NINE_BYTES = `0x${'ab'.repeat(9)}`

// under ten bytes there is nothing worth eliding, the size still shows
export const NotePreimageNineBytes: StoryObj = {
    ...detail(of(notePreimage(NINE_BYTES))),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText(`${NINE_BYTES} (9 bytes)`)).toBeVisible()
        await openJson(canvas)
        await expect(canvasElement.textContent).toContain(`${NINE_BYTES} (9 bytes)`)
    },
}

const TEN_BYTES = `0x${'ab'.repeat(10)}`

export const NotePreimageTenBytes: StoryObj = {
    ...detail(of(notePreimage(TEN_BYTES))),
    play: async ({canvas}) => expect(canvas.getByText(`${TEN_BYTES.slice(0, 10)}…${TEN_BYTES.slice(-8)} (10 bytes)`)).toBeVisible(),
}

const ONE_BYTE = '0xab'

export const NotePreimageOneByte: StoryObj = {
    ...detail(of(notePreimage(ONE_BYTE))),
    play: async ({canvas}) => expect(canvas.getByText(`${ONE_BYTE} (1 byte)`)).toBeVisible(),
}

const batchedPreimage = (height: number) => {
    const bytes = SHORT_TEXT
    const args = {calls: [{__kind: 'Preimage', value: {__kind: 'note_preimage', bytes}}]}
    return {...signedCall(height, 'Utility.batch_all', args), calls: [[[], 'Utility.batch_all', args], [[0], 'Preimage.note_preimage', {bytes}]]}
}

// the batch's own JSON holds the call it wraps, so that copy is summarized too
export const BatchedNotePreimage: StoryObj = {
    ...detail(of(batchedPreimage)),
    play: async ({canvas, canvasElement}) => {
        await openJson(canvas)
        await expect(canvasElement.textContent).toContain('(16 bytes)')
        await expect(canvasElement.textContent).not.toContain(SHORT_TEXT)
    },
}

const SHORT_CODE = `0x${'ab'.repeat(32)}`

// a runtime's code shows only its ends and size, whatever its length
export const PrimeUpgrade: StoryObj = {
    ...detail(of((height: number) => signedCall(height, 'Prime.upgrade', {code: SHORT_CODE}))),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText(`${SHORT_CODE.slice(0, 10)}…${SHORT_CODE.slice(-8)} (32 bytes)`)).toBeVisible()
        await expect(canvas.getByText(hexHash(SHORT_CODE))).toBeVisible()
        await expect(canvas.getByRole('link', {name: 'download'})).toBeVisible()
        await expect(canvasElement.textContent).not.toContain(SHORT_CODE)
        await openJson(canvas)
        await expect(canvasElement.textContent).toContain('(32 bytes)')
        await expect(canvasElement.textContent).not.toContain(SHORT_CODE)
    },
}

const LONG_REMARK = `0x${'ab'.repeat(2048)}`

const remark = (hex: string) => (height: number) => signedCall(height, 'System.remark', {remark: hex})

// bytes that aren't text show their ends and size in the table, the JSON keeps them whole
export const LongRemark: StoryObj = {
    ...detail(of(remark(LONG_REMARK))),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText(`${LONG_REMARK.slice(0, 10)}…${LONG_REMARK.slice(-8)} (2,048 bytes)`)).toBeVisible()
        await expect(canvas.getByText(hexHash(LONG_REMARK))).toBeVisible()
        await expect(within(canvasElement.querySelector<HTMLElement>('[data-slot=args-table]')!).getByRole('button', {name: 'copy'})).toBeVisible()
        await expect(canvas.getByRole('link', {name: 'download'}).getAttribute('href')).toMatch(new RegExp(`^/api/bytes\\?call=.+&hash=${hexHash(LONG_REMARK)}$`))
        await expect(canvasElement.textContent).not.toContain(LONG_REMARK)
        await openJson(canvas)
        await expect(canvas.getByText(new RegExp(LONG_REMARK))).toBeVisible()
    },
}

const REMARK_TEXT = 'A short remark'

// text has a hash to copy and nothing to download
export const RemarkText: StoryObj = {
    ...detail(of(remark(utf8Hex(REMARK_TEXT)))),
    play: async ({canvas}) => {
        await expect(canvas.getByText(REMARK_TEXT)).toBeVisible()
        await expect(canvas.getByText('14 bytes · UTF-8')).toBeVisible()
        await expect(canvas.getByText(hexHash(utf8Hex(REMARK_TEXT)))).toBeVisible()
        await expect(canvas.queryByRole('link', {name: 'download'})).toBeNull()
    },
}

const REMARK_LINES = 'Line one of a remark\nLine two'

export const RemarkMultilineText: StoryObj = {
    ...detail(of(remark(utf8Hex(REMARK_LINES)))),
    play: async ({canvas}) => {
        await expect(canvas.getByText('29 bytes · UTF-8')).toBeVisible()
        await expect(canvas.getByText(hexHash(utf8Hex(REMARK_LINES)))).toBeVisible()
    },
}

const HUNDRED_CHARS = '界'.repeat(100)

// exactly at the limit, counted in characters rather than bytes
export const RemarkAtTextLimit: StoryObj = {
    ...detail(of(remark(utf8Hex(HUNDRED_CHARS)))),
    play: async ({canvas}) => {
        await expect(canvas.getByText(HUNDRED_CHARS)).toBeVisible()
        await expect(canvas.queryByText('(truncated)')).toBeNull()
        await expect(canvas.queryByRole('button', {name: 'Show full'})).toBeNull()
    },
}

const LONG_TEXT = `${'😀'.repeat(100)} and the rest\nof the remark`

// past the limit it cuts on a whole character and opens in full in a dialog
export const RemarkLongText: StoryObj = {
    ...detail(of(remark(utf8Hex(LONG_TEXT)))),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('(truncated)')).toBeVisible()
        await expect(canvasElement.textContent).toContain(`${'😀'.repeat(100)}…`)
        await expect(canvasElement.textContent).not.toContain('and the rest')
        await userEvent.click(canvas.getByRole('button', {name: 'Show full'}))
        const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog')
        await expect(dialog.textContent).toContain(LONG_TEXT)
        await expect(dialog.textContent).not.toContain('(truncated)')
    },
}

export const RemarkShortBinary: StoryObj = {
    ...detail(of(remark('0x00ff10'))),
    play: async ({canvas}) => expect(canvas.getByText('0x00ff10 (3 bytes)')).toBeVisible(),
}

const LONG_MARKDOWN = `# Marketing budget\n\nThis referendum allocates **2,000,000 NUMN** from the treasury to community airdrops and task rewards.`

const centerY = (el: Element) => {
    const {top, height} = el.getBoundingClientRect()
    return top + height / 2
}

// the dialog opens on the raw text and renders it as markdown on request, its header on one line
export const RemarkLongMarkdown: StoryObj = {
    ...detail(of(remark(utf8Hex(LONG_MARKDOWN)))),
    play: async ({canvas, canvasElement}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'Show full'}))
        const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog')
        const panel = within(dialog)
        await expect(dialog.textContent).toContain('**2,000,000 NUMN**')
        await expect(panel.queryByRole('heading', {level: 1})).toBeNull()
        const centers = [panel.getByRole('heading', {name: 'Text'}), panel.getByRole('tablist'), panel.getByRole('button', {name: 'Close'})].map(centerY)
        await expect(centers[1]).toBeCloseTo(centers[0], 0)
        await expect(centers[2]).toBeCloseTo(centers[0], 0)
        await userEvent.click(panel.getByRole('tab', {name: 'Markdown'}))
        await expect(panel.getByRole('heading', {level: 1, name: 'Marketing budget'})).toBeVisible()
        await expect(dialog.textContent).not.toContain('**')
    },
}

export const PayoutBatch = detail(payout)

export const PayoutBatchPage2 = detail(payout, {tab: 'calls', page: '2'})

export const PayoutBatchLastPage = detail(payout, {tab: 'calls', page: lastPage(payout.calls.length)})

// the args switch to their JSON and back to the table
export const ArgsToggle: StoryObj = {
    ...detail(sent),
    play: async ({canvas}) => {
        await userEvent.click(canvas.getByRole('tab', {name: 'JSON'}))
        await expect(canvas.getByText(/"dest"/)).toBeVisible()
        await userEvent.click(canvas.getByRole('tab', {name: 'Table'}))
        await expect(canvas.getByText('dest')).toBeVisible()
    },
}

// a runtime newer than the metadata the explorer ships with leaves only the raw args
export const UnknownRuntime: StoryObj = {
    ...detail({...sent, calls: sent.calls.map((c: Call) => ({...c, block: {specVersion: 999}}))}),
    play: async ({canvas}) => {
        await expect(canvas.queryByRole('tab', {name: 'Table'})).toBeNull()
        await expect(canvas.getByText(/"transfer_keep_alive"|"dest"/)).toBeVisible()
    },
}
