import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {pageStory} from '../../../.storybook/page'

// the page asks for the plain count and the pair count apart, told by token0_isNull
export const list = (rows: object[], plain = rows.length, pairs = 0, tab?: string) =>
    pageStory({tokens: rows, tokensConnection: ({where}: {where: {token0_isNull: boolean}}) => ({totalCount: where.token0_isNull ? plain : pairs})}, {searchParams: tab ? {tab} : {}})

export const counts =
    (plain: string, pairs: string): StoryObj['play'] =>
    async ({canvas}) => {
        await expect(canvas.getByRole('tab', {name: new RegExp(`^Tokens\\s*${plain}$`)})).toBeVisible()
        await expect(canvas.getByRole('tab', {name: new RegExp(`^LP\\s*${pairs}$`)})).toBeVisible()
    }
