'use client'

import {Search} from 'lucide-react'
import {parseAsInteger, parseAsString, useQueryStates} from 'nuqs'
import {useEffect, useMemo, useState} from 'react'
import {useDebouncedCallback} from 'use-debounce'
import {cn} from 'cn'
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group'
import {searchFilter} from '@/lib/actionFilters'

// a search goes out once typing pauses this long, a cleared box at once
export const PAUSE_MS = 300

// the pager's keys ride along so that a new search starts over at the first
// page of the default size
const URL_KEYS = {...searchFilter, page: parseAsInteger, size: parseAsInteger}

const NONE: readonly string[] = []

// the box holds what is typed and the url takes it in one write once typing
// pauses. nuqs debounces each key on its own timer, which can write q apart
// from the paging it resets. resets names more keys a new search clears
export default function SearchBox({placeholder = 'Search address or identity', resets = NONE, className}: {placeholder?: string; resets?: readonly string[]; className?: string}) {
    const keys = useMemo(() => ({...URL_KEYS, ...Object.fromEntries(resets.map(k => [k, parseAsString]))}), [resets])
    const [{q}, setFilters] = useQueryStates(keys, {shallow: false, history: 'push', scroll: false})
    const [text, setText] = useState(q)
    const search = useDebouncedCallback((text: string) => setFilters({q: text, page: null, size: null, ...Object.fromEntries(resets.map(k => [k, null]))}), PAUSE_MS)
    // back and forward bring the box along and drop a search still waiting
    useEffect(() => {
        search.cancel()
        setText(q)
    }, [q, search])
    const type = (value: string) => {
        setText(value)
        search(value)
        if (!value) search.flush()
    }
    return (
        <InputGroup className={cn('bg-card', className)}>
            <InputGroupAddon className="pr-[3px] pl-3">
                <Search className="size-[15px] text-dim" />
            </InputGroupAddon>
            <InputGroupInput value={text} onChange={e => type(e.target.value)} placeholder={placeholder} spellCheck={false} className="pr-3 text-sm placeholder:text-dim" />
        </InputGroup>
    )
}
