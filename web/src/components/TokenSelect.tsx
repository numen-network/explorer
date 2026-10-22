import logo from '@/app/icon.svg'
import TokenIcon from '@/components/TokenIcon'
import {FilterSelect} from '@/components/pills'
import {shortHash} from '@/lib/format'
import type {TokenRef} from '@/lib/gql'

// picks one contract token by its id. native leads with the chain's own coin
// under the empty value. a token reads by its symbol with its contract after
// it, one without a symbol by its contract alone
export default function TokenSelect({tokens, native, value, href}: {tokens: TokenRef[]; native?: string; value: string; href: (id: string) => string}) {
    const symbolOf = (id: string) => tokens.find(t => t.id === id)?.symbol
    return (
        <FilterSelect
            label="Token"
            all={false}
            values={[...(native != null ? [''] : []), ...tokens.map(t => t.id)]}
            labelOf={id => (id ? (symbolOf(id) ?? shortHash(id)) : native!)}
            iconOf={id => (id ? <TokenIcon addr={id} /> : native != null ? <img src={logo.src} alt="" /> : undefined)}
            noteOf={id => (symbolOf(id) != null ? shortHash(id) : undefined)}
            value={value}
            href={href}
        />
    )
}
