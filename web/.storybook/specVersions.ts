/// <reference types="vite/client" />
import jsonl from '../../squid/specVersions.jsonl?raw'
import type {RuntimeVersionRow} from '../src/lib/gql'

export const specVersions = (): RuntimeVersionRow[] =>
    jsonl
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
