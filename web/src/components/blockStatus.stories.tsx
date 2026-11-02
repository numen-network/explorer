import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {BlockStatus, HeadsProvider} from './blockStatus'

const HEIGHT = 1_000

function Marks() {
    return (
        <HeadsProvider heads={{best: HEIGHT + 5, finalized: HEIGHT - 2, indexed: HEIGHT}}>
            {[HEIGHT - 2, HEIGHT, HEIGHT + 1].map(height => (
                <p key={height} data-height={height} className="flex items-center gap-2 text-sm">
                    #{height} <BlockStatus height={height} />
                </p>
            ))}
        </HeadsProvider>
    )
}

export default {title: 'Components/BlockStatus', component: Marks} satisfies Meta<typeof Marks>

// finalized up to the finalized head, confirming up to the indexed head, nothing past it
export const EveryMark: StoryObj<typeof Marks> = {
    play: async ({canvasElement}) => {
        const mark = (height: number) => canvasElement.querySelector(`[data-height="${height}"] [role=img]`)?.getAttribute('aria-label')
        await expect(mark(HEIGHT - 2)).toBe('Finalized')
        await expect(mark(HEIGHT)).toBe('Confirming')
        await expect(mark(HEIGHT + 1)).toBeUndefined()
    },
}
