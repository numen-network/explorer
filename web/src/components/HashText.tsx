import FullText from '@/components/FullText'
import {shortHash} from '@/lib/format'

// anything written in 0x hex shows either full or as the fixed 0x4…4 split
export default function HashText({hash, full}: {hash: string; full?: boolean}) {
    return full ? <FullText text={hash} short={shortHash(hash)} /> : shortHash(hash)
}
