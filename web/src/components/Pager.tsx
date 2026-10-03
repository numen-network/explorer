'use client'
import {useId, useState} from 'react'
import {useRouter} from 'next/navigation'
import * as pagination from '@zag-js/pagination'
import {normalizeProps, useMachine} from '@zag-js/react'
import {ChevronsLeft, ChevronsRight, Ellipsis} from 'lucide-react'
import {cn} from 'cn'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious} from '@/components/ui/pagination'
import {Tip} from '@/components/Tip'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {PAGE_SIZES, type Paging} from '@/lib/paging'

interface Props {
    paging: Paging
    total: number
    href: string
    className?: string
}

const JUMP = 5
const off = 'pointer-events-none opacity-50'
const ACTIVE = 'border-primary bg-primary bg-clip-border text-primary-foreground hover:bg-primary hover:text-primary-foreground'

// the url is the state, the machines only lay out the page windows and their aria
export default function Pager({paging: {page, size}, total, href, className = 'mt-3'}: Props) {
    const router = useRouter()
    const [goto, setGoto] = useState('')
    const url = (p: number, s: number) => {
        const [path, query] = href.split('?')
        const q = new URLSearchParams(query)
        q.set('page', String(p))
        q.set('size', String(s))
        return `${path}?${q}`
    }
    const props = {count: total, pageSize: size, page, type: 'link', getPageUrl: d => url(d.page, d.pageSize)} satisfies Partial<pagination.Props>
    const api = pagination.connect(useMachine(pagination.machine, {...props, id: useId(), siblingCount: 2}), normalizeProps)
    const narrow = pagination.connect(useMachine(pagination.machine, {...props, id: useId(), siblingCount: 0}), normalizeProps)
    if (total <= PAGE_SIZES[0]) return null
    const paged = api.totalPages > 1
    const jump = () => {
        const n = Math.min(api.totalPages, Math.max(1, Math.floor(Number(goto))))
        if (!n) return
        setGoto('')
        router.push(url(n, size), {scroll: false})
    }
    // slots keep their nodes, so a sliding window changes the numbers under the accent instead of fading it through a neighbour
    const slots = ({pages, totalPages, getItemProps}: pagination.Api, hide: string) =>
        pages.map((p, i) => {
            if (p.type === 'page')
                return (
                    <PaginationItem key={i} className={hide}>
                        <PaginationLink {...getItemProps(p)} href={url(p.value, size)} scroll={false} isActive={p.value === page} size="default" className={cn('min-w-8 px-1.5 transition-none', p.value === page && ACTIVE)}>
                            {p.value}
                        </PaginationLink>
                    </PaginationItem>
                )
            // the page right after a gap says which side of the current page the gap is on
            const next = pages[i + 1] as {value: number}
            const back = next.value <= page
            const label = back ? `Previous ${JUMP} pages` : `Next ${JUMP} pages`
            const Arrows = back ? ChevronsLeft : ChevronsRight
            return (
                <PaginationItem key={i} className={hide}>
                    <Tip text={label}>
                        <PaginationLink href={url(back ? Math.max(1, page - JUMP) : Math.min(totalPages, page + JUMP), size)} scroll={false} aria-label={label}>
                            <Ellipsis className="group-hover/button:hidden" />
                            <Arrows className="hidden group-hover/button:block" />
                        </PaginationLink>
                    </Tip>
                </PaginationItem>
            )
        })
    return (
        <Pagination className={cn('flex-wrap items-center justify-end gap-x-4 gap-y-2', className)} {...api.getRootProps()}>
            {paged && (
                <PaginationContent className="-mr-1.5">
                    <PaginationItem>
                        <PaginationPrevious {...api.getPrevTriggerProps()} href={url(api.previousPage ?? 1, size)} scroll={false} aria-disabled={api.previousPage === null} className={cn(api.previousPage === null && off)} />
                    </PaginationItem>
                    {slots(narrow, 'md:hidden')}
                    {slots(api, 'max-md:hidden')}
                    <PaginationItem>
                        <PaginationNext {...api.getNextTriggerProps()} href={url(api.nextPage ?? page, size)} scroll={false} aria-disabled={api.nextPage === null} className={cn(api.nextPage === null && off)} />
                    </PaginationItem>
                </PaginationContent>
            )}
            <Select value={String(size)} onValueChange={v => router.push(url(1, Number(v)), {scroll: false})}>
                <SelectTrigger className="w-30 justify-end bg-card" aria-label="Rows per page">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {PAGE_SIZES.map(n => (
                        <SelectItem key={n} value={String(n)}>
                            {n} / page
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {paged && (
                <Label className="font-normal">
                    Go to page
                    <Input value={goto} onChange={e => setGoto(e.target.value)} inputMode="numeric" pattern="[0-9]*" className="min-w-16 bg-card text-center" style={{width: `calc(${String(api.totalPages).length + 1}ch + 1.25rem + 2px)`}} onKeyDown={e => e.key === 'Enter' && jump()} />
                </Label>
            )}
        </Pagination>
    )
}
