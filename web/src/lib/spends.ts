import type {BadgeVariant} from '@/components/ui/badge'

export const SPEND_KIND_LABEL: Record<string, string> = {spend_local: 'Local', spend: 'Spend'}

// badge tones keyed by the Treasury event a spend last raised
export const SPEND_TONE: Record<string, BadgeVariant> = {
    SpendApproved: 'warn',
    AssetSpendApproved: 'warn',
    Awarded: 'pos',
    Paid: 'pos',
    AssetSpendVoided: 'neg',
    PaymentFailed: 'neg',
    SpendProcessed: 'idle',
}
