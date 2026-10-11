'use client'
import {useId, useState} from 'react'
import {useRouter} from 'next/navigation'
import * as pagination from '@zag-js/pagination'
import {normalizeProps, useMachine} from '@zag-js/react'
import {ChevronsLeft, ChevronsRight, Ellipsis} from 'lucide-react'
import {cn} from 'cn'
import Dropdown from '@/components/Dropdown'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious} from '@/components/ui/pagination'
import {Tip} from '@/components/Tip'
import {fmtCount} from '@/lib/format'
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

// px at text-sm, kept in step with the classes below
const ARROWS = {icon: 68, label: 173}
const LINK = {min: 32, inset: 14, digit: 9}
const GAP = 2
const OVERHANG = 6
const slot = (p: pagination.Api['pages'][number]) => (p.type === 'page' ? Math.max(LINK.min, LINK.inset + LINK.digit * String(p.value).length) : LINK.min)
const span = ({pages}: pagination.Api, arrows: number) => pages.reduce((px, p) => px + GAP + slot(p), arrows + GAP - OVERHANG)

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
    const narrowest = pagination.connect(useMachine(pagination.machine, {...props, id: useId(), siblingCount: 0, boundaryCount: 0}), normalizeProps)
    if (total <= PAGE_SIZES[0]) return null
    const paged = api.totalPages > 1
    const jump = () => {
        const n = Math.min(api.totalPages, Math.max(1, Math.floor(Number(goto))))
        if (!n) return
        setGoto('')
        router.push(url(n, size), {scroll: false})
    }
    // a container query can't read a custom property, so every set of widths gets rules of its own
    const widths = [span(api, ARROWS.label), span(narrow, ARROWS.label), span(narrow, ARROWS.icon)]
    const fit = widths.join('-')
    const swap = (px: number, media: string, hide: number, show: number) =>
        `@container (width < ${px / 16}rem) { @media ${media} { [data-fit="${fit}"] [data-slots="${hide}"] { display: none } [data-fit="${fit}"] [data-slots="${show}"] { display: list-item } } }`
    // slots keep their nodes, so a sliding window changes the numbers under the accent instead of fading it through a neighbour
    const slots = ({pages, totalPages, getItemProps}: pagination.Api, n: number, hide: string) => {
        const current = pages.findIndex(p => p.type === 'page' && p.value === page)
        return pages.map((p, i) => {
            if (p.type === 'page')
                return (
                    <PaginationItem key={i} className={hide} data-slots={n}>
                        <PaginationLink {...getItemProps(p)} href={url(p.value, size)} scroll={false} isActive={p.value === page} size="default" className={cn('min-w-8 px-1.5 transition-none', p.value === page && ACTIVE)}>
                            {p.value}
                        </PaginationLink>
                    </PaginationItem>
                )
            const back = i < current
            const label = `${back ? 'Previous' : 'Next'} ${fmtCount(JUMP, 'page')}`
            const Arrows = back ? ChevronsLeft : ChevronsRight
            return (
                <PaginationItem key={i} className={hide} data-slots={n}>
                    <Tip text={label}>
                        <PaginationLink href={url(back ? Math.max(1, page - JUMP) : Math.min(totalPages, page + JUMP), size)} scroll={false} aria-label={label}>
                            <Ellipsis className="group-hover/button:hidden" />
                            <Arrows className="hidden group-hover/button:block" />
                        </PaginationLink>
                    </Tip>
                </PaginationItem>
            )
        })
    }
    return (
        <Pagination className={cn('@container flex-wrap items-center justify-end gap-x-4 gap-y-2', className)} {...api.getRootProps()} data-fit={fit}>
            {paged && (
                <PaginationContent className="-mr-1.5">
                    <style href={fit} precedence="pager">
                        {swap(widths[0], '(width >= 48rem)', 9, 5) + swap(widths[1], '(width >= 40rem)', 5, 3) + swap(widths[2], '(width < 40rem)', 5, 3)}
                    </style>
                    <PaginationItem>
                        <PaginationPrevious {...api.getPrevTriggerProps()} href={url(api.previousPage ?? 1, size)} scroll={false} aria-disabled={api.previousPage === null} className={cn(api.previousPage === null && off)} />
                    </PaginationItem>
                    {slots(narrowest, 3, 'hidden')}
                    {slots(narrow, 5, 'md:hidden')}
                    {slots(api, 9, 'max-md:hidden')}
                    <PaginationItem>
                        <PaginationNext {...api.getNextTriggerProps()} href={url(api.nextPage ?? page, size)} scroll={false} aria-disabled={api.nextPage === null} className={cn(api.nextPage === null && off)} />
                    </PaginationItem>
                </PaginationContent>
            )}
            <Dropdown label="Rows per page" value={String(size)} options={PAGE_SIZES.map(n => ({value: String(n), label: `${n} / page`}))} onChange={v => router.push(url(1, Number(v)), {scroll: false})} />
            {paged && (
                <Label className="font-normal">
                    Go to page
                    <Input value={goto} onChange={e => setGoto(e.target.value)} inputMode="numeric" pattern="[0-9]*" className="min-w-16 bg-card text-center" style={{width: `calc(${String(api.totalPages).length + 1}ch + 1.25rem + 2px)`}} onKeyDown={e => e.key === 'Enter' && jump()} />
                </Label>
            )}
        </Pagination>
    )
}
