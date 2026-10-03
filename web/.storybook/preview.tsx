import type {Preview} from '@storybook/nextjs-vite'
import {mswLoader} from 'msw-storybook-addon/csf3'
import {Inter} from 'next/font/google'
import {TooltipProvider} from '../src/components/ui/tooltip'
import {WellKnownProvider} from '../src/components/wellKnown'
import {ss58Encode} from '../src/lib/ss58'
import {chainInfo} from '../../mock/fixtures.js'
import '../src/app/globals.css'

const inter = Inter({subsets: ['latin'], variable: '--font-inter'})
document.documentElement.classList.add(inter.variable)

const preview: Preview = {
    parameters: {nextjs: {appDirectory: true}},
    loaders: [mswLoader()],
    decorators: [
        Story => (
            <WellKnownProvider treasury={ss58Encode(chainInfo.treasuryAccount, chainInfo.ss58)} prime="" evmChainId={chainInfo.evmChainId}>
                <TooltipProvider>
                    <Story />
                </TooltipProvider>
            </WellKnownProvider>
        ),
    ],
}

export default preview
