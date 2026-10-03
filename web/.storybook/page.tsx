import type {Meta, StoryObj} from '@storybook/nextjs-vite'
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
            async ({parameters}) => ({
                page: await settle(await page({params: Promise.resolve(parameters.params ?? {}), searchParams: Promise.resolve(parameters.searchParams ?? {})} as P)),
            }),
        ],
        render: (_, {loaded}) => loaded.page,
    }) satisfies Meta

export const pageStory = (data: Record<string, unknown>, {params = {}, searchParams = {}} = {}): StoryObj => ({
    parameters: {params, searchParams, msw: [graphqlData({...base, ...data})]},
})

// the page a list ends on at the default page size
export const lastPage = (total: number) => String(Math.ceil(total / paging({}).size))
