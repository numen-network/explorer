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

#### Status

- [x] proposal drafted
- [ ] funds paid

##### Terms

A late report moves its payout, never its amount.[^1]

###### Note

> Unspent funds go back to the treasury.

Run \`numen --dev\` or:

\`\`\`sh
numen --chain mainnet --rpc-port 9944
\`\`\`

---

![team photo](${AVATAR_HOST}/team.png)

[^1]: As agreed in the forum thread.`

// one of each block the renderer draws, a task list by its checkboxes and the notes by their section
const BLOCKS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'table', 'ol', 'ul', 'input[type=checkbox]', 'blockquote', 'pre', 'hr', 'img', 'section[data-footnotes]']

export const EveryBlock: Story = {
    args: {text: EVERY_BLOCK},
    play: async ({canvasElement}) => expect(BLOCKS.filter(block => !canvasElement.querySelector(`.prose ${block}`))).toEqual([]),
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

// a lone newline stays a line break
export const LineBreaks: Story = {
    args: {text: 'Votes within a day\nNo split votes\nAsk on Discord'},
    play: async ({canvasElement}) => expect(canvasElement.querySelector<HTMLElement>('.prose')!.innerText).toBe('Votes within a day\nNo split votes\nAsk on Discord'),
}

export const RawHtml: Story = {
    args: {text: '<script>alert(1)</script>\n\n<b>bold</b>'},
    play: async ({canvasElement}) => expect(canvasElement.querySelector('script, b')).toBeNull(),
}

// a link that leaves the page opens in a new tab with no opener or referrer, and a script url keeps no href
export const SafeLinks: Story = {
    args: {text: 'See the [forum thread](https://forum.example.com/t/42), or [click](javascript:alert(1))'},
    play: async ({canvas, canvasElement}) => {
        await expect([...canvasElement.querySelectorAll('a')].map(a => [a.target, a.rel])).toEqual([
            ['_blank', 'noopener noreferrer'],
            ['_blank', 'noopener noreferrer'],
        ])
        await expect(canvas.getByText('click').getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
    },
}

export const FootnoteLinksStayOnPage: Story = {
    args: {text: 'A late report moves its payout, never its amount.[^1]\n\n[^1]: As agreed in the forum thread.'},
    play: async ({canvasElement}) => {
        await expect([...canvasElement.querySelectorAll('a')].map(a => [a.getAttribute('href'), a.target])).toEqual([
            ['#user-content-fn-1', ''],
            ['#user-content-fnref-1', ''],
        ])
    },
}

const UNBROKEN = 'x'.repeat(600)

export const UnbrokenRunsStayInCard: Story = {
    args: {text: `${UNBROKEN}\n\n\`${UNBROKEN}\`\n\n| ${UNBROKEN} |\n| --- |\n| cell |`},
    play: async ({canvasElement}) => expectFits(canvasElement.querySelector('[data-slot=card]')!, ...canvasElement.querySelectorAll('.prose > p')),
}

export const RightToLeft: Story = {
    args: {text: '## نشغّل مدقق الشبكة الرئيسية\n\nونصوّت على **كل** استفتاء للخزينة.'},
    play: async ({canvasElement}) => expect(canvasElement.querySelector('.prose')!.matches(':dir(rtl)')).toBe(true),
}
