import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {ME, MULTISIG_ENDS, multisigCall, SIGNATORIES} from '../../../../../mock/fixtures/accounts.js'
import {batchAll} from '../../../../../mock/fixtures/blocks.js'
import {PEOPLE} from '../../../../../mock/fixtures.js'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, summaries, strip, addressOp, asAddress} from './page.stories.helpers'

export default {title: 'Pages/Account/Multisig | As a multisig address', ...pageMeta(AccountPage), decorators: [wellKnown]}

const ran = multisigCall(ME, batchAll)

// an expanded operation loads its call tree and its signatories with the page
export const OperationCall: StoryObj = {
    ...story({multisigOps: [{...addressOp(2), call: ran.call}], multisigCalls: ran.calls, refs: PEOPLE}, {tab: 'multisig'}),
    play: async ({canvasElement}) => {
        const canvas = within(canvasElement)
        await userEvent.click(await canvas.findByRole('button', {name: 'expand'}))
        expect(canvas.getByRole('heading', {name: 'Approvals'})).toBeVisible()
        expect(canvas.getAllByText('Utility.batch_all')).toHaveLength(2)
        expect(canvas.getAllByText('Balances.transfer_keep_alive')).toHaveLength(ran.calls.length - 1)
    },
}

// each signatory's approvals and openings over the six operations, the tile above them
export const SignatoriesWithTile: StoryObj = {
    ...story({multisigOps: asAddress(MULTISIG_ENDS.length), refs: PEOPLE}, {tab: 'multisig', mtab: 'signatories'}),
    play: async ({canvasElement}) => {
        expect(strip(canvasElement, 'As a multisig address', 'mtab')).toEqual([
            ['operations', String(MULTISIG_ENDS.length), null],
            ['signatories', String(SIGNATORIES.length), 'page'],
        ])
        expect(summaries(canvasElement)).toEqual([{Threshold: `3 of ${SIGNATORIES.length}`, Pending: '3', Operations: String(MULTISIG_ENDS.length)}])
        const cells = (i: number) => [...canvasElement.querySelectorAll('tbody tr')].map(tr => tr.children[i].textContent)
        expect(cells(1)).toEqual(['2', '3', '3', '1', '0'])
        expect(cells(2)).toEqual(['2', '2', '2', '0', '0'])
    },
}

const manyOps = asAddress(45)

export const Many = story({multisigOps: manyOps}, {tab: 'multisig'})

export const Page2 = story({multisigOps: manyOps}, {tab: 'multisig', page: '2'})

export const LastPage = story({multisigOps: manyOps}, {tab: 'multisig', page: lastPage(manyOps.length)})
