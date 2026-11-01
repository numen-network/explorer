import {findAndReplace} from 'mdast-util-find-and-replace'
import {ss58TryDecode} from './ss58'

const BASE58_RUN = /\b[1-9A-HJ-NP-Za-km-z]{40,}\b/g
const REFERENDUM = /\breferendum #(\d{1,9})\b/gi

export function addressesIn(text: string, ss58: number): string[] {
    return (text.match(BASE58_RUN) ?? []).flatMap(run => ss58TryDecode(run, ss58) ?? [])
}

export function referendaIn(text: string): number[] {
    return [...text.matchAll(REFERENDUM)].map(m => Number(m[1]))
}

export function remarkChainRefs({ss58}: {ss58: number}) {
    return (tree: Parameters<typeof findAndReplace>[0]) =>
        findAndReplace(
            tree,
            [
                [
                    BASE58_RUN,
                    (run: string) => {
                        const id = ss58TryDecode(run, ss58)
                        return id ? {type: 'link', url: `/account/${run}`, data: {hProperties: {dataAccount: id}}, children: [{type: 'text', value: run}]} : false
                    },
                ],
                [REFERENDUM, (whole: string, index: string) => ({type: 'link', url: `/referendum/${index}`, data: {hProperties: {dataReferendum: index}}, children: [{type: 'text', value: whole}]})],
            ],
            {ignore: ['link', 'linkReference']}
        )
}
