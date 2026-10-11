import {readFileSync} from 'node:fs'
import path from 'node:path'

// the metadata the indexer generates its types from, one runtime version per line
export const specVersionsJsonl = () => readFileSync(path.join(process.cwd(), '../squid/specVersions.jsonl'), 'utf8')
