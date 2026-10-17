import {toSvg} from 'jdenticon'
import {cn} from 'cn'

/**
 * Jdenticon over the public key, the substrate theme polkadot.js and the
 * wallet draw, so one account wears the same face in all three. The svg
 * scales to the box, the ring and the white behind it belong to the box.
 */
export default function Identicon({hex, className}: {hex: string; className?: string}) {
    return (
        <span
            aria-hidden
            className={cn('inline-flex shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-input ring-inset [&>svg]:size-full', className)}
            dangerouslySetInnerHTML={{__html: toSvg(hex.slice(2), 56)}}
        />
    )
}
