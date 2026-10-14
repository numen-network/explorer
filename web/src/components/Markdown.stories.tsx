import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor} from 'storybook/test'
import {AVATAR_HOST, avatars} from '../../.storybook/avatar'
import {expectFits} from '../../.storybook/fit'
import Markdown from './Markdown'
import {Card} from './ui/card'

const meta = {
    title: 'Components/Markdown',
    component: Markdown,
    parameters: {msw: [avatars]},
    decorators: [
        Story => (
            <Card size="flush" className="max-w-2xl px-7 py-5">
                <Story />
            </Card>
        ),
    ],
} satisfies Meta<typeof Markdown>
export default meta
type Story = StoryObj<typeof meta>

const EVERY_BLOCK = `# Fund the medium spender pilot

Pays a pilot cohort of **three** community teams, see the [forum thread](https://forum.example.com/t/42).

## Budget

| Team | Amount |
| --- | ---: |
| Docs | 12,000 NUMN |
| Tooling | 30,000 NUMN |

### Milestones

1. Kickoff
2. Monthly reports
   - posted in the thread
   - ~~weekly calls~~

- [x] proposal drafted
- [ ] funds paid

> Unspent funds go back to the treasury.

Run \`numen --dev\` or:

\`\`\`sh
numen --chain mainnet --rpc-port 9944
\`\`\`

---

![team photo](${AVATAR_HOST}/team.png)`

export const EveryBlock: Story = {
    args: {text: EVERY_BLOCK},
    play: async ({canvas, canvasElement}) => {
        expect(canvas.getByRole('heading', {level: 1, name: 'Fund the medium spender pilot'})).toBeInTheDocument()
        expect(canvas.getByRole('table')).toBeInTheDocument()
        expect(canvas.getAllByRole('checkbox')).toHaveLength(2)
        for (const a of canvasElement.querySelectorAll('a')) expect(a.rel).toBe('noopener noreferrer')
        expect(canvas.getByRole('img', {name: 'team photo'})).toHaveAttribute('src', `${AVATAR_HOST}/team.png`)
    },
}

// an https picture shows like an avatar does, any other source stays a link
export const Images: Story = {
    args: {text: `![wide](${AVATAR_HOST}/wide.png)\n\n![plain](http://avatar.example/plain.png)\n\n![](data:image/svg+xml,%3Csvg%3E%3C/svg%3E)`},
    play: async ({canvas, canvasElement}) => {
        const img = canvas.getByRole('img', {name: 'wide'})
        expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
        await waitFor(() => expect((img as HTMLImageElement).naturalWidth).toBeGreaterThan(0))
        expect(img.getBoundingClientRect().width).toBeLessThanOrEqual(canvasElement.querySelector('.prose')!.clientWidth)
        expect(canvasElement.querySelectorAll('img')).toHaveLength(1)
        expect(canvas.getByRole('link', {name: 'plain'})).toHaveAttribute('href', 'http://avatar.example/plain.png')
    },
}

// a lone newline stays a line break, as the plain text showed it before
export const LineBreaks: Story = {
    args: {text: 'Votes within a day\nNo split votes\nAsk on Discord'},
    play: async ({canvasElement}) => expect(canvasElement.querySelector<HTMLElement>('.prose')!.innerText).toBe('Votes within a day\nNo split votes\nAsk on Discord'),
}

export const RawHtml: Story = {
    args: {text: '<script>alert(1)</script>\n\n<b>bold</b> [click](javascript:alert(1))'},
    play: async ({canvas, canvasElement}) => {
        expect(canvasElement.querySelector('script, b')).toBeNull()
        expect(canvas.getByText('click').getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
    },
}

const UNBROKEN = 'x'.repeat(600)

export const Unbroken: Story = {
    args: {text: `${UNBROKEN}\n\n\`${UNBROKEN}\`\n\n| ${UNBROKEN} |\n| --- |\n| cell |`},
    play: async ({canvasElement}) => expectFits(canvasElement.querySelector('[data-slot=card]')!, ...canvasElement.querySelectorAll('.prose > p')),
}

export const RightToLeft: Story = {
    args: {text: '## نشغّل مدقق الشبكة الرئيسية\n\nونصوّت على **كل** استفتاء للخزينة.'},
    play: async ({canvasElement}) => expect(canvasElement.querySelector('.prose')!.matches(':dir(rtl)')).toBe(true),
}
