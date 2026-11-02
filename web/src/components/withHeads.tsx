import type {ReactNode} from 'react'
import {HeadsProvider} from '@/components/blockStatus'
import {chainHeads} from '@/lib/chain'

// the heads share the request cache with the page's own head.
// its block marks and its text then read one indexed head
export function withHeads<P>(page: (props: P) => Promise<ReactNode>) {
    return async function WithHeads(props: P) {
        const [heads, body] = await Promise.all([chainHeads(), page(props)])
        return <HeadsProvider heads={heads}>{body}</HeadsProvider>
    }
}
