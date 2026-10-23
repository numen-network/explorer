import Link from 'next/link'
import {cn} from 'cn'
import {TabsList, TabsTrigger} from '@/components/ui/tabs'

const STRIP = 'flex h-8 w-fit items-center justify-center gap-1 rounded-lg border bg-card p-0.5'
const ITEM = 'relative inline-flex h-full flex-1 items-center justify-center rounded-lg px-2.5 text-sm font-normal whitespace-nowrap text-muted-foreground transition-all hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring data-active:bg-primary/8 data-active:font-medium data-active:text-primary'
const SM = {strip: 'h-6 group-data-horizontal/tabs:h-6 rounded-md', item: 'rounded-[5px] px-2 text-xs'}

export interface SegmentLink {
    label: string
    href: string
    active: boolean
}

type Props = {size?: 'default' | 'sm'; className?: string} & ({options: SegmentLink[]; 'aria-label': string} | {options: [value: string, label: string][]})

// picks one of a few options and applies it right away. options with an href
// are links that rewrite the url and keep the scroll, value pairs trigger the
// shadcn Tabs root around the control to switch panels already on the page.
// sm sits beside content rather than among the filter controls
export default function SegmentedControl(props: Props) {
    const sm = props.size === 'sm'
    const strip = cn(STRIP, sm && SM.strip, props.className)
    const item = cn(ITEM, sm && SM.item)
    if ('aria-label' in props) {
        return (
            <nav aria-label={props['aria-label']} className={strip}>
                {props.options.map(o => (
                    <Link key={o.href} href={o.href} scroll={false} aria-current={o.active ? 'page' : undefined} data-active={o.active} className={item}>
                        {o.label}
                    </Link>
                ))}
            </nav>
        )
    }
    return (
        <TabsList className={strip}>
            {props.options.map(([value, label]) => (
                <TabsTrigger key={value} value={value} className={cn(item, 'border-0 group-data-[variant=default]/tabs-list:data-active:shadow-none')}>
                    {label}
                </TabsTrigger>
            ))}
        </TabsList>
    )
}
