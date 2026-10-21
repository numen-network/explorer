import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {bytecode, evmAddress, evmTx, exit, EXIT, WTMR} from '../../../../../mock/fixtures/evm.js'
import {NST} from '../../../../../mock/fixtures/sourcify.js'
import {expectFits} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import {sourcify} from '../../../../.storybook/sourcify'
import TokenPage from './page'
import {tokenPage} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Token/Contract', ...pageMeta(TokenPage)}

const wtmrDeploy = evmTx(WTMR.deployTx.block.height, 0, {from: evmAddress(0), to: null, contractAddress: WTMR.id, input: bytecode(3_072), gasLimit: '3000000', gasUsed: '2100000', ...exit(EXIT.returned)})

// the token's own contract, read from Sourcify
export const Verified: StoryObj = {
    ...tokenPage(WTMR, {created: [wtmrDeploy], msw: [sourcify({body: NST})]}, {tab: 'contract'}),
    play: async ({canvas}) => {
        const panel = canvas.getByRole('tabpanel')
        expect(within(panel).getByText('Exact match')).toBeVisible()
        expect(within(panel).getByText('Creation code', {selector: 'div'}).nextElementSibling).toHaveTextContent('3,072 bytes')
        expectFits(...panel.querySelectorAll('[data-slot=card]'))
    },
}
