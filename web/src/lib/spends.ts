export const SPEND_KIND_LABEL: Record<string, string> = {spend_local: 'Local', spend: 'Spend'}

// where a spend stands at the indexed head. the status is the Treasury event it
// raised last, and an approved asset spend moves on with the head alone
export const SPEND_STATES = ['Approved', 'Pending', 'Claimable', 'Expired', 'Paid', 'Failed', 'Voided'] as const
export type SpendState = (typeof SPEND_STATES)[number]

export const SPEND_STATE_TONE: Record<SpendState, 'pos' | 'warn' | 'neg' | 'idle'> = {
    Approved: 'warn',
    Pending: 'idle',
    Claimable: 'warn',
    Expired: 'neg',
    Paid: 'pos',
    Failed: 'neg',
    Voided: 'neg',
}

export interface SpendTimes {
    status: string
    validFrom: number | null
    expireAt: number | null
    paidAt: number | null
}

// Paid and an expiry both end in SpendProcessed, only a Paid before it tells them apart
export function spendState(s: SpendTimes, head: number): SpendState {
    switch (s.status) {
        case 'SpendApproved':
            return 'Approved'
        case 'Awarded':
        case 'Paid':
            return 'Paid'
        case 'PaymentFailed':
            return 'Failed'
        case 'AssetSpendVoided':
            return 'Voided'
        case 'SpendProcessed':
            return s.paidAt != null ? 'Paid' : 'Expired'
    }
    if (s.expireAt != null && s.expireAt <= head) return 'Expired'
    if (s.validFrom != null && s.validFrom > head) return 'Pending'
    return 'Claimable'
}

// spendState as a TreasurySpend filter, an approved asset spend always carries both bounds
export function spendStateWhere(state: SpendState, head: number): string {
    const approved = 'status_eq: "AssetSpendApproved"'
    switch (state) {
        case 'Approved':
            return 'status_eq: "SpendApproved"'
        case 'Pending':
            return `${approved}, validFrom_gt: ${head}, expireAt_gt: ${head}`
        case 'Claimable':
            return `${approved}, validFrom_lte: ${head}, expireAt_gt: ${head}`
        case 'Expired':
            return `OR: [{${approved}, expireAt_lte: ${head}}, {status_eq: "SpendProcessed", paidAt_isNull: true}]`
        case 'Paid':
            return 'OR: [{status_in: ["Awarded", "Paid"]}, {status_eq: "SpendProcessed", paidAt_isNull: false}]'
        case 'Failed':
            return 'status_eq: "PaymentFailed"'
        case 'Voided':
            return 'status_eq: "AssetSpendVoided"'
    }
}
