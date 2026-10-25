import {chainHeads} from '@/lib/chain'

export async function GET() {
    return Response.json(await chainHeads())
}
