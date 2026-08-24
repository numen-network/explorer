import {redirect} from 'next/navigation'
import {CHARTS} from '@/lib/charts'

export default function ChartsIndex() {
    redirect(`/charts/${CHARTS[0].slug}`)
}
