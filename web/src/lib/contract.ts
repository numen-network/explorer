import {chainProps} from '@/lib/chain'
import {contractCreation} from '@/lib/gql'
import {highlight} from '@/lib/highlight'
import {sourcifyContract, type SourcifyContract, type SourcifyLookup} from '@/lib/sourcify'

export interface CodeFile {
    title: string
    code: string
    html: string
    lines: number
}

export interface ContractData {
    chainId: number
    lookup: SourcifyLookup
    files: CodeFile[]
    creation: {id: string; input: string} | null
}

const LANG: Record<string, string> = {Solidity: 'solidity', Vyper: 'vyper'}

// the compiled contract's own file leads, the ABI closes
function codeFiles(c: SourcifyContract) {
    const lang = LANG[c.compilation.language] ?? 'text'
    const name = c.compilation.fullyQualifiedName
    const target = name.slice(0, name.lastIndexOf(':'))
    const paths = [target, ...Object.keys(c.sources).filter(path => path !== target)]
    const files = paths.map(path => codeFile(path, c.sources[path].content, lang))
    if (c.abi) files.push(codeFile('ABI', JSON.stringify(c.abi, null, 2), 'json'))
    return Promise.all(files)
}

// shiki numbers the empty line after a closing newline, an editor doesn't
async function codeFile(title: string, code: string, lang: string): Promise<CodeFile> {
    const shown = code.endsWith('\n') ? code.slice(0, -1) : code
    return {title, code, html: await highlight(shown, lang), lines: shown.split('\n').length}
}

export async function contractData(address: string): Promise<ContractData> {
    const {evmChainId} = await chainProps()
    const [lookup, creation] = await Promise.all([sourcifyContract(evmChainId, address), contractCreation(address)])
    const files = lookup.status === 'verified' ? await codeFiles(lookup.contract) : []
    return {chainId: evmChainId, lookup, files, creation}
}
