import type {Preview} from '@storybook/nextjs-vite'
import {mswLoader} from 'msw-storybook-addon/csf3'
import {Inter} from 'next/font/google'
import {TooltipProvider} from '../src/components/ui/tooltip'
import '../src/app/globals.css'

const inter = Inter({subsets: ['latin'], variable: '--font-inter'})
document.documentElement.classList.add(inter.variable)

const preview: Preview = {
    parameters: {nextjs: {appDirectory: true}},
    loaders: [mswLoader()],
    decorators: [
        Story => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}

export default preview
