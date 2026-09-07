'use client'

import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle} from '@/components/ui/empty'

export default function Error({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
    return (
        <Card size="flush" className="mt-6">
            <Empty className="gap-5 py-12 text-wrap">
                <EmptyHeader className="gap-2">
                    <EmptyTitle className="text-lg font-semibold tracking-normal">Something broke</EmptyTitle>
                    <EmptyDescription className="text-sm">
                        Data source unreachable or the query failed.
                        {error.digest && <span className="font-mono"> · {error.digest}</span>}
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button onClick={reset} className="h-auto border-0 px-4 py-2 hover:bg-primary-hover">
                        Retry
                    </Button>
                </EmptyContent>
            </Empty>
        </Card>
    )
}
