'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'
import {Search} from 'lucide-react'
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from '@/components/ui/input-group'

export default function SearchBar() {
    const router = useRouter()
    const [q, setQ] = useState('')
    return (
        <form
            onSubmit={e => {
                e.preventDefault()
                const s = q.trim()
                if (s) router.push(`/search?q=${encodeURIComponent(s)}`)
            }}
        >
            <InputGroup className="h-auto overflow-hidden rounded-lg bg-card shadow-[0_1px_2px_rgb(20_24_33/0.04)] has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[>[data-align=inline-end]]:[&>input]:pr-3">
                <InputGroupAddon className="pr-1.5 pl-4">
                    <Search className="size-[15px] text-dim" />
                </InputGroupAddon>
                <InputGroupInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search by block height / extrinsic / hash / account / EVM address / identity / token" className="h-12 text-sm placeholder:text-dim" />
                <InputGroupAddon align="inline-end" className="self-stretch py-0 pr-0 has-[>button]:mr-0">
                    <InputGroupButton type="submit" variant="default" size="sm" className="h-full w-28 rounded-none border-0 px-0 text-sm font-medium shadow-none hover:bg-primary-hover">
                        Search
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </form>
    )
}
