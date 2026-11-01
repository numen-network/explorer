import Link from 'next/link'
import type {ComponentProps} from 'react'
import ReactMarkdown, {type Components} from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import {cn} from 'cn'
import AccountLink from '@/components/AccountLink'
import MarkdownImage from '@/components/MarkdownImage'
import {Tip} from '@/components/Tip'
import {remarkChainRefs} from '@/lib/chainRefs'
import type {IdentityRef} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'

export interface ChainRefs {
    ss58: number
    accounts: Map<string, IdentityRef>
    titles: Map<number, string | null>
}

const anchor = (props: ComponentProps<'a'>) => (props.href?.startsWith('#') ? <a {...props} /> : <a {...props} target="_blank" rel="noopener noreferrer" />)

const components: Components = {
    a: ({node: _, ...props}) => anchor(props),
    img: ({src, alt}) => {
        const href = typeof src === 'string' ? src : undefined
        // keyed so a fixed address gets a fresh try
        return <MarkdownImage key={href} src={href} alt={alt} />
    },
    table: ({node: _, ...props}) => (
        <div className="overflow-x-auto">
            <table {...props} />
        </div>
    ),
}

const withChainRefs = ({ss58, accounts, titles}: ChainRefs): Components => ({
    ...components,
    a: ({node, ...props}) => {
        const {dataAccount: id, dataReferendum} = node!.properties
        if (typeof id === 'string') return <AccountLink addr={ss58Encode(id, ss58)} acc={accounts.get(id)} />
        if (dataReferendum)
            return (
                <Tip text={`#${dataReferendum} ${titles.get(Number(dataReferendum)) ?? ''}`}>
                    <Link href={props.href!}>{props.children}</Link>
                </Tip>
            )
        return anchor(props)
    },
})

export default function Markdown({text, refs, className}: {text: string; refs?: ChainRefs; className?: string}) {
    return (
        <div dir="auto" className={cn('prose prose-sm max-w-none wrap-anywhere', className)}>
            <ReactMarkdown remarkPlugins={refs ? [remarkGfm, remarkBreaks, [remarkChainRefs, {ss58: refs.ss58}]] : [remarkGfm, remarkBreaks]} components={refs ? withChainRefs(refs) : components}>
                {text}
            </ReactMarkdown>
        </div>
    )
}
