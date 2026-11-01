import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor} from 'storybook/test'
import {AVATAR_HOST, avatars} from '../../.storybook/avatar'
import {expectFits} from '../../.storybook/fit'
import {ss58Encode} from '../lib/ss58'
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

// an image that won't load, like a web page address, falls back to a link named by its alt or its address
export const BrokenImages: Story = {
    args: {text: '![shot](https://127.0.0.1:1/shot.png)\n\n![](https://127.0.0.1:1/blank.png)'},
    play: async ({canvas, canvasElement}) => {
        await waitFor(() => expect(canvasElement.querySelectorAll('img')).toHaveLength(0))
        expect(canvas.getByRole('link', {name: 'shot'})).toHaveAttribute('href', 'https://127.0.0.1:1/shot.png')
        expect(canvas.getByRole('link', {name: 'https://127.0.0.1:1/blank.png'})).toHaveAttribute('href', 'https://127.0.0.1:1/blank.png')
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

const SS58 = 14240
const NAMED = `0x${'11'.repeat(32)}`
const UNNAMED = `0x${'22'.repeat(32)}`
const named = ss58Encode(NAMED, SS58)
const unnamed = ss58Encode(UNNAMED, SS58)
const foreign = ss58Encode(NAMED, 42)
const refs = {ss58: SS58, accounts: new Map([[NAMED, {id: NAMED, identityDisplay: 'Orbit Labs'}]]), titles: new Map([[12, 'Fund the medium spender pilot']])}

// a chain address links to its account, named or not
export const ChainAddresses: Story = {
    args: {text: `Proposer ${named}\n\nMultisig ${unnamed} holds the payout.`, refs},
    play: async ({canvas}) => {
        expect(canvas.getByRole('link', {name: /Orbit Labs/})).toHaveAttribute('href', `/account/${named}`)
        const short = canvas.getByRole('link', {name: /^nu/})
        expect(short).toHaveAttribute('href', `/account/${unnamed}`)
        expect(short).not.toHaveAttribute('target')
    },
}

// the word in front is what makes a number a referendum, the author's casing stays
export const ReferendumMentions: Story = {
    args: {text: 'Follows Referendum #12 and referendum #3, ranked #1 globally, see issue #7.', refs},
    play: async ({canvas, canvasElement}) => {
        await expect([...canvasElement.querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href'), a.target])).toEqual([
            ['Referendum #12', '/referendum/12', ''],
            ['referendum #3', '/referendum/3', ''],
        ])
        expect(canvas.getByText(/ranked #1 globally/)).toBeInTheDocument()
    },
}

// code, an existing link, another chain's address and a broken checksum all stay as written
export const TextLeftAsWritten: Story = {
    args: {
        text: `\`${named}\`\n\n[Referendum #5](https://forum.example.com/t/5)\n\n${foreign}\n\n${named.slice(0, -1)}${named.endsWith('1') ? '2' : '1'}`,
        refs,
    },
    play: async ({canvas, canvasElement}) => {
        expect(canvasElement.querySelector('code')).toHaveTextContent(named)
        await expect([...canvasElement.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(['https://forum.example.com/t/5'])
        expect(canvas.getByText(foreign)).toBeInTheDocument()
    },
}

// no refs passed, like a bio, keeps addresses and mentions plain
export const WithoutRefs: Story = {
    args: {text: `${named} and Referendum #12`},
    play: async ({canvasElement}) => expect(canvasElement.querySelector('a')).toBeNull(),
}

// several addresses in a row stay inside the card
export const ChainAddressStaysInCard: Story = {
    args: {text: `${unnamed} ${named} ${unnamed}`, refs},
    play: async ({canvasElement}) => expectFits(canvasElement.querySelector('[data-slot=card]')!, ...canvasElement.querySelectorAll('.prose > p')),
}
