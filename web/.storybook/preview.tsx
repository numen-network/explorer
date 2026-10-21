import type {Decorator, Preview} from '@storybook/nextjs-vite'
import {mswLoader} from 'msw-storybook-addon/csf3'
import {Inter} from 'next/font/google'
import {NuqsTestingAdapter} from 'nuqs/adapters/testing'
import {MINIMAL_VIEWPORTS} from 'storybook/viewport'
import {useFaceOrder} from '../src/components/AccountFace'
import {TooltipProvider} from '../src/components/ui/tooltip'
import {WellKnownProvider} from '../src/components/wellKnown'
import {ss58Encode} from '../src/lib/ss58'
import {chainInfo} from '../../mock/fixtures.js'
import {urlUpdates} from './url'
import '../src/app/globals.css'

const inter = Inter({subsets: ['latin'], variable: '--font-inter'})
document.documentElement.classList.add(inter.variable)

// the site pads a page 24px each side and runs only its header and footer edge to edge
const siteGutters: Decorator = (Story, {parameters}) =>
    parameters.layout === 'fullscreen' ? (
        <Story />
    ) : (
        <div className="px-6 py-4">
            <Story />
        </div>
    )

const preview: Preview = {
    parameters: {
        nextjs: {appDirectory: true},
        // siteGutters does the padding, the same in Storybook and the test runner
        layout: 'none',
        // lg layouts at their narrowest
        viewport: {options: {...MINIMAL_VIEWPORTS, laptop: {name: 'Laptop', styles: {width: '1024px', height: '768px'}, type: 'desktop'}}},
        options: {
            storySort: {
                method: 'alphabetical',
                // home, the top menu in its order, then the other pages, a page's parts in the order the page shows them
                order: [
                    'Pages',
                    [
                        'Home',
                        ['Daily transactions', 'Network status', 'Stats', 'Latest blocks', 'Transfers', 'Referenda', 'Network info'],
                        'Blocks',
                        'Transfers',
                        'Extrinsics',
                        'Events',
                        'Accounts',
                        'People',
                        ['Overview', 'Tabs', 'Identities', 'Registrars', 'Usernames', 'Authorities'],
                        'Tokens',
                        ['Tabs', 'Tokens', 'LP'],
                        'Governance',
                        ['Overview', 'Tabs', 'Referenda', 'Treasury spends', 'Tracks', 'Delegates'],
                        'Validators',
                        'Miners',
                        'Charts',
                        [
                            'Chart list',
                            'Range',
                            'Blocks Produced',
                            'Average Block Time',
                            'Difficulty',
                            'Active Miners',
                            'Block Rewards',
                            'Signed Extrinsics',
                            'Total Signed Extrinsics',
                            'EVM Transactions',
                            'Transaction Fees',
                            'Transfers',
                            'Total Transfers',
                            'Transfer Volume',
                            'Total Transfer Volume',
                            'Total Accounts',
                            'Total Referenda',
                            'Total Issuance',
                            'Active Issuance',
                            'Transferable Issuance',
                            'Treasury Pot',
                        ],
                        'Search',
                        ['Query', 'Tabs', 'Accounts', 'Tokens'],
                        'Block',
                        ['Overview', 'Tabs', 'Extrinsics', 'Events', 'Logs'],
                        'Extrinsic',
                        ['Overview', 'Tabs', 'Calls', 'Events', 'Ambiguous hash'],
                        'Event',
                        'Token',
                        ['Overview', 'Tabs', 'Holders', 'Transfers', 'Contract'],
                        'Account',
                        [
                            'Header',
                            'Balance',
                            'Tabs',
                            'Transfers | Native',
                            'Transfers | Tokens',
                            'Transfers | Counterparties',
                            'Tokens',
                            'Extrinsics',
                            'Locks',
                            'Vesting',
                            'Identity | Direct',
                            'Identity | Sub',
                            'Identity | Judgements',
                            'Identity | Timeline',
                            'Registrar',
                            'Validator | Timeline',
                            'Validator | Offences',
                            'Mining',
                            'Proxies',
                            'Multisig | As a multisig address',
                            'Multisig | As a multisig signatory',
                            'Governance | Votes',
                            'Governance | Vote history',
                            'Governance | Proposed',
                            'Governance | Treasury',
                            'Governance | Received',
                            'Governance | Received history',
                            'Governance | Delegations',
                            'Governance | Delegations history',
                            'Charts',
                        ],
                        'Referendum',
                        ['Overview', 'Request', 'Status', 'Tally', 'Tabs', 'Call', 'Metadata', 'Text history', 'Timeline', 'Votes', 'Curves', 'Statistics'],
                        'Bounties',
                        'Bounty',
                        ['Overview', 'Tabs', 'Timeline', 'Child bounties'],
                        'EVM Address',
                        ['Overview', 'Tabs', 'Transactions', 'Tokens', 'Contract'],
                        'EVM Transaction',
                        ['Overview', 'Tabs', 'Native transfers', 'Token transfers', 'Logs'],
                        'Error',
                        'Not Found',
                    ],
                    'Components',
                ],
            },
        },
    },
    loaders: [mswLoader()],
    beforeEach: () => {
        urlUpdates.mockClear()
        localStorage.clear()
        useFaceOrder.setState(useFaceOrder.getInitialState())
    },
    decorators: [
        // the mocked next router never moves the url, so the url state runs on
        // a url of its own that opens on the story's query and keeps every update
        (Story, {parameters}) => (
            <NuqsTestingAdapter searchParams={parameters.searchParams} hasMemory onUrlUpdate={urlUpdates}>
                <Story />
            </NuqsTestingAdapter>
        ),
        siteGutters,
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
