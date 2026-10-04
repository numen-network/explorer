import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {getURLFromRedirectError} from 'next/dist/client/components/redirect'
import {isRedirectError} from 'next/dist/client/components/redirect-error'
import {cloneElement, isValidElement, type ReactNode} from 'react'
import {paging} from '../src/lib/paging'
import {base} from '../../mock/fixtures.js'
import {graphqlData} from './graphql'

interface PageProps {
    params: Promise<object>
    searchParams: Promise<object>
}

type AsyncComponent = (props: object) => Promise<ReactNode>

// awaits every async server component in the tree, which only a server would do,
// and rebuilds just the path above each one
async function settle(node: ReactNode): Promise<ReactNode> {
    if (Array.isArray(node)) {
        const out = await Promise.all(node.map(settle))
        return out.every((n, i) => n === node[i]) ? node : out.map((n, i) => (n !== node[i] && isValidElement(n) ? cloneElement(n, {key: i}) : n))
    }
    if (!isValidElement<{children?: ReactNode}>(node)) return node
    const {type, props} = node
    if (typeof type === 'function' && type.constructor.name === 'AsyncFunction') return settle(await (type as AsyncComponent)(props))
    const children = await settle(props.children)
    return children === props.children ? node : cloneElement(node, {children})
}

// awaiting the page in a loader fetches its data once, rendering it async would refetch on every pass
export const pageMeta = <P extends PageProps>(page: (props: P) => Promise<ReactNode>) =>
    ({
        loaders: [
            async ({parameters}) => {
                try {
                    const tree = await settle(await page({params: Promise.resolve(parameters.params ?? {}), searchParams: Promise.resolve(parameters.searchParams ?? {})} as P))
                    if (parameters.redirect) throw new Error(`the page rendered instead of redirecting to ${parameters.redirect}`)
                    return {page: tree}
                } catch (e) {
                    if (isRedirectError(e) && getURLFromRedirectError(e) === parameters.redirect) return {page: null}
                    throw e
                }
            },
        ],
        render: (_, {loaded}) => loaded.page,
    }) satisfies Meta

export const pageStory = (data: Record<string, unknown>, {params = {}, searchParams = {}, redirect}: {params?: object; searchParams?: object; redirect?: string} = {}): StoryObj => ({
    parameters: {params, searchParams, redirect, msw: [graphqlData({...base, ...data})]},
})

// the site pads a page 24px each side, Storybook 16px and the test runner
// nothing, so a story checking how a page fits a viewport pads it the site's way
export const inSiteGutters = (story: StoryObj, viewport: StoryObj['globals']): StoryObj => ({
    ...story,
    globals: viewport,
    parameters: {...story.parameters, layout: 'fullscreen'},
    decorators: [
        Story => (
            <div className="px-6">
                <Story />
            </div>
        ),
    ],
})

// the page a list ends on at the default page size
export const lastPage = (total: number) => String(Math.ceil(total / paging({}).size))
