import {hexToBytes} from '@noble/hashes/utils.js'
import {findBytes} from '@/lib/args'
import {isH256} from '@/lib/evm'
import {callArgs, preimageArgs, proposalArgs} from '@/lib/gql'

const notFound = () => new Response('not found', {status: 404})

export async function GET(request: Request) {
    const params = new URL(request.url).searchParams
    const hash = params.get('hash') ?? ''
    const call = params.get('call')
    const preimage = params.get('preimage')
    const referendum = params.get('referendum') ?? ''
    if (!isH256(hash) || (!call && !preimage && !/^\d{1,9}$/.test(referendum))) return notFound()
    const source = await (call ? callArgs(call) : preimage ? preimageArgs(preimage) : proposalArgs(Number(referendum)))
    const hex = source && findBytes(source.args, hash, source.specVersion)
    if (!hex) return notFound()
    return new Response(hexToBytes(hex.slice(2)), {
        headers: {'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${hash}.bin"`},
    })
}
