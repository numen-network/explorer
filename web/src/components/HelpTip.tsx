import {CircleQuestionMark} from 'lucide-react'
import {Tip} from '@/components/Tip'

export default function HelpTip({text}: {text: string}) {
    return (
        <Tip text={text}>
            <CircleQuestionMark aria-label={text} className="ml-1 inline size-3 align-[-1px]" />
        </Tip>
    )
}
