import {Fragment, type CSSProperties} from 'react'
import CopyBtn from '@/components/CopyBtn'
import {Card} from '@/components/ui/card'
import type {CodeFile} from '@/lib/contract'

// a narrow card breaks a long path after a slash before it splits a name
function Path({path}: {path: string}) {
    const parts = path.split('/')
    return parts.map((part, i) => (
        <Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
                <>
                    /<wbr />
                </>
            )}
        </Fragment>
    ))
}

export default function CodeCard({file}: {file: CodeFile}) {
    const digits = String(file.lines).length
    return (
        <Card size="flush" className="divide-y">
            <div className="flex items-center px-5 py-2.5 text-sm font-semibold">
                <span className="min-w-0 font-mono wrap-anywhere">
                    <Path path={file.title} />
                </span>
                <CopyBtn text={file.code} />
            </div>
            <div tabIndex={0} className="source-code max-h-112 overflow-auto" style={{'--digits': digits} as CSSProperties} dangerouslySetInnerHTML={{__html: file.html}} />
        </Card>
    )
}
