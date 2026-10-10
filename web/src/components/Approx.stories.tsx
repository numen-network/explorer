import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {CHAIN, MAX_U128, PLANCK} from '../../../mock/fixtures/accounts.js'
import {numn} from '../../../mock/fixtures.js'
import Approx from './Approx'

const meta = {title: 'Components/Approx'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

type Case = [label: string, planck: string, text: string, symbol?: string]

// a figure within two decimals reads as it is, a cut one carries ≈
const VALUES: Case[] = [
    ['two decimals', numn(1.15), '1.15 NUMN', 'NUMN'],
    ['cut', numn(99.999), '≈99.99 NUMN', 'NUMN'],
    ['one planck', PLANCK, '≈0 NUMN', 'NUMN'],
    ['millions', numn(603_623_456), '≈603.62M NUMN', 'NUMN'],
    ['fall', `-${numn(528.456)}`, '≈−528.45 NUMN', 'NUMN'],
    ['u128 ceiling', MAX_U128, '≈340.28E NUMN', 'NUMN'],
    ['no symbol', numn(1_234_567.8), '≈1.23M'],
]

// a move signs a rise as well as a fall
const MOVES: Case[] = [
    ['rise', numn(138_412.3456), '≈+138.41K'],
    ['fall', `-${numn(528.4)}`, '−528.4'],
    ['flat', '0', '0'],
]

const sheet = (cases: Case[], move?: boolean) => (
    <div className="grid grid-cols-[160px_auto] items-center gap-x-6 gap-y-2 font-mono text-sm">
        {cases.map(([label, planck, , symbol]) => (
            <div key={label} className="contents">
                <span className="font-sans text-xs text-muted-foreground">{label}</span>
                <span data-case={label}>
                    <Approx planck={planck} decimals={CHAIN.decimals} symbol={symbol} move={move} />
                </span>
            </div>
        ))}
    </div>
)

// each figure reads as written, and the ≈ of a cut one comes from the system
// sans 2px ahead of the figure
const figures =
    (cases: Case[]): Story['play'] =>
    async ({canvasElement}) => {
        for (const [label, , text] of cases) {
            const cell = canvasElement.querySelector(`[data-case="${label}"]`)!
            const mark = cell.querySelector('span')
            expect({label, text: cell.textContent, marked: mark !== null}).toEqual({label, text, marked: text.startsWith('≈')})
            if (!mark) continue
            // a narrow column wraps the symbol, the gap is read off the figure's first line
            const figure = document.createRange()
            figure.selectNodeContents(mark.nextSibling!)
            expect({label, font: getComputedStyle(mark).fontFamily, gap: Math.round(figure.getClientRects()[0].left - mark.getBoundingClientRect().right)}).toEqual({label, font: 'sans-serif', gap: 2})
        }
    }

export const Values: Story = {render: () => sheet(VALUES), play: figures(VALUES)}

export const Moves: Story = {render: () => sheet(MOVES, true), play: figures(MOVES)}
