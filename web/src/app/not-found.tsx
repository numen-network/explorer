import Link from 'next/link'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle} from '@/components/ui/empty'

export default function NotFound() {
    return (
        <Card size="flush" className="mt-6">
            <Empty className="gap-5 py-12 text-wrap">
                <EmptyHeader className="gap-2">
                    <EmptyTitle className="text-lg font-semibold tracking-normal">Not found</EmptyTitle>
                    <EmptyDescription className="text-sm">Nothing lives at this address, or it is not indexed yet.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button asChild className="h-auto border-0 px-4 py-2 hover:bg-primary-hover">
                        <Link href="/">Back home</Link>
                    </Button>
                </EmptyContent>
            </Empty>
        </Card>
    )
}
