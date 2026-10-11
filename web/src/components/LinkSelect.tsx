'use client'
import {useRouter} from 'next/navigation'
import Dropdown from '@/components/Dropdown'

interface LinkOption {
    label: string
    count?: number
    href: string
}

interface Props {
    label: string
    options: LinkOption[]
    value: string
    fit?: string[]
}

// a dropdown whose options are links, value is the href of the one picked
export default function LinkSelect({label, options, value, fit}: Props) {
    const router = useRouter()
    return <Dropdown label={label} value={value} options={options.map(o => ({value: o.href, label: o.label, count: o.count}))} onChange={href => router.push(href, {scroll: false})} fit={fit} />
}
