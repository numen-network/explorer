import ReactMarkdown, {type Components} from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import {cn} from 'cn'
import MarkdownImage from '@/components/MarkdownImage'

const components: Components = {
    a: ({node: _, ...props}) => (props.href?.startsWith('#') ? <a {...props} /> : <a {...props} target="_blank" rel="noopener noreferrer" />),
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

export default function Markdown({text, className}: {text: string; className?: string}) {
    return (
        <div dir="auto" className={cn('prose prose-sm max-w-none wrap-anywhere', className)}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
                {text}
            </ReactMarkdown>
        </div>
    )
}
