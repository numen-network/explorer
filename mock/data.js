import {toHex} from './engine.js'

const HEAD = 1_000_000
const HEAD_TIME = Date.now()
const BLOCK_TIME = 10
const SUBMISSION_DEPOSIT = '5000000000000000000'
const ISSUANCE_TOTAL = '602518848000000000000000000'
const ISSUANCE_INACTIVE = '550000154663232139351368277'

const at = height => new Date(HEAD_TIME - (HEAD - height) * BLOCK_TIME * 1000).toISOString()
const numn = n => (BigInt(n) * 10n ** 18n).toString()
const account = n => '0x' + ('a' + n.toString(16)).repeat(32)
const hash = n => '0x' + ('c' + n.toString(16)).repeat(32)
const hex = text => toHex(new TextEncoder().encode(text))

const linear = (length, floor, ceil) => ({__kind: 'LinearDecreasing', length, floor, ceil})
const reciprocal = (factor, xOffset, yOffset) => ({__kind: 'Reciprocal', factor, xOffset, yOffset})
const RECIPROCAL_APPROVAL = reciprocal('222222224', '333333335', '333333332')
const RECIPROCAL_SUPPORT = reciprocal('16649324', '32258065', '-16129033')

const trackRow = (id, name, maxDeciding, maxSpend, decisionDeposit, preparePeriod, confirmPeriod, minEnactmentPeriod, minApproval, minSupport, decisionPeriod = 241920) => ({
    id, name, maxDeciding, maxSpend, decisionDeposit, preparePeriod, decisionPeriod, confirmPeriod, minEnactmentPeriod, minApproval, minSupport,
})

const tracks = [
    trackRow('0', 'root', 1, null, numn(100000), 8640, 8640, 8640, RECIPROCAL_APPROVAL, linear(1e9, 0, 5e8)),
    trackRow('1', 'runtime_upgrade', 1, null, numn(100), 60, 60, 60, RECIPROCAL_APPROVAL, reciprocal('378501', '756429', '-378215')),
    trackRow('2', 'wish_for_change', 10, null, numn(1000), 720, 8640, 60, RECIPROCAL_APPROVAL, linear(1e9, 0, 5e8)),
    trackRow('10', 'identity_admin', 10, null, numn(1000), 720, 8640, 60, RECIPROCAL_APPROVAL, RECIPROCAL_SUPPORT),
    trackRow('20', 'referendum_canceller', 1000, null, numn(1000), 720, 8640, 60, linear(1e9, 5e8, 1e9), RECIPROCAL_SUPPORT, 60480),
    trackRow('21', 'referendum_killer', 1000, null, numn(10000), 720, 8640, 60, linear(1e9, 5e8, 1e9), RECIPROCAL_SUPPORT),
    trackRow('30', 'small_spender', 100, numn(200000), numn(100), 1440, 8640, 8640, linear(25e7, 5e8, 1e9), reciprocal('3846922', '7712083', '1182519')),
    trackRow('31', 'medium_spender', 20, numn(1000000), numn(200), 1440, 25920, 8640, linear(5e8, 5e8, 1e9), reciprocal('5846821', '11734029', '1720990')),
    trackRow('32', 'big_spender', 2, numn(10000000), numn(1000), 1440, 60480, 8640, linear(1e9, 5e8, 1e9), reciprocal('7901235', '15873016', '2222222')),
]
const trackById = Object.fromEntries(tracks.map(t => [t.id, t]))

const step = (name, block, index) => ({name, block, event: `${String(block).padStart(10, '0')}-00000-${String(index).padStart(6, '0')}`, timestamp: at(block)})

const spend = (amount, beneficiary) => ({
    proposalPallet: 'Treasury',
    proposalMethod: 'spend',
    proposalArgs: {amount: numn(amount), validFrom: null, beneficiary},
    proposalCalls: [{pallet: 'Treasury', method: 'spend', depth: 0, amount: numn(amount), beneficiary, validFrom: null}],
    proposalAmount: numn(amount),
    proposalBeneficiary: beneficiary,
})

// history rows are [block, ayes, nays, support] in whole NUMN, one per tally
// snapshot the indexer would write, the last one is the tally now
function referendum({index, track, origin, submitter, steps, decidingSince = null, confirmingSince = null, endedAt = null, history = [], deposits, ...rest}) {
    const t = trackById[track]
    const [, ayes, nays, support] = history.at(-1) ?? [0, 0, 0, 0]
    return {
        id: String(index),
        index,
        track: t,
        origin: {__kind: 'Origins', value: {__kind: origin}},
        proposalHash: hash(index),
        submitter: {id: account(submitter)},
        submittedAt: steps[0].block,
        submittedTimestamp: steps[0].timestamp,
        status: 'Ongoing',
        decidingSince,
        confirmingSince,
        endedAt,
        ayes: numn(ayes),
        nays: numn(nays),
        support: numn(support),
        timeline: steps,
        submissionDepositor: deposits ? account(submitter) : null,
        submissionDeposit: deposits ? SUBMISSION_DEPOSIT : null,
        decisionDepositor: deposits === 'both' ? account(submitter) : null,
        decisionDeposit: deposits === 'both' ? t.decisionDeposit : null,
        snapshots: history.map(([block, a, n, s]) => ({
            block,
            ayes: numn(a),
            nays: numn(n),
            support: numn(s),
            totalIssuance: ISSUANCE_TOTAL,
            inactiveIssuance: ISSUANCE_INACTIVE,
        })),
        ...rest,
    }
}

export const referenda = [
    referendum({
        index: 11,
        track: '31',
        origin: 'MediumSpender',
        submitter: 11,
        status: 'TimedOut',
        title: 'Timed out waiting for a decision deposit after votes came in',
        ...spend(120_000, account(12)),
        steps: [
            step('Referenda.Submitted', 400_000, 2),
            step('Referenda.TimedOut', 520_960, 0),
            step('Referenda.SubmissionDepositRefunded', 525_000, 1),
        ],
        endedAt: 520_960,
        history: [
            [400_500, 400_000, 0, 300_000],
            [430_000, 400_000, 250_000, 300_000],
            [480_000, 700_000, 250_000, 550_000],
            [520_960, 700_000, 250_000, 550_000],
        ],
    }),
    referendum({
        index: 10,
        track: '30',
        origin: 'SmallSpender',
        submitter: 1,
        status: 'Approved',
        title: 'Approved early after eight days waiting for its decision deposit',
        ...spend(50_000, account(2)),
        steps: [
            step('Referenda.Submitted', 600_000, 3),
            step('Referenda.DecisionStarted', 669_000, 3),
            step('Referenda.DecisionDepositPlaced', 669_000, 6),
            step('Referenda.ConfirmStarted', 690_000, 0),
            step('Referenda.Confirmed', 698_640, 0),
            step('Referenda.Approved', 698_640, 1),
            step('Scheduler.Dispatched', 707_280, 0),
            step('Referenda.SubmissionDepositRefunded', 710_000, 2),
            step('Referenda.DecisionDepositRefunded', 710_000, 3),
        ],
        decidingSince: 669_000,
        confirmingSince: 690_000,
        endedAt: 698_640,
        history: [
            [600_200, 50_000, 0, 50_000],
            [630_000, 2_200_000, 0, 2_000_000],
            [668_500, 3_400_000, 0, 3_000_000],
            [669_000, 3_400_000, 0, 3_000_000],
            [680_000, 4_000_000, 200_000, 3_500_000],
            [698_640, 4_000_000, 200_000, 3_500_000],
        ],
    }),
    referendum({
        index: 9,
        track: '2',
        origin: 'WishForChange',
        submitter: 0,
        title: 'Voting inside the prepare period with the decision deposit already in',
        proposalPallet: 'System',
        proposalMethod: 'remark',
        proposalArgs: {remark: hex('Fund a community translation sprint')},
        proposalCalls: [{pallet: 'System', method: 'remark', depth: 0}],
        steps: [
            step('Referenda.Submitted', 999_700, 2),
            step('Referenda.DecisionDepositPlaced', 999_705, 4),
        ],
        history: [
            [999_710, 3_000_000, 0, 2_000_000],
            [999_760, 3_000_000, 800_000, 2_000_000],
            [999_900, 3_400_000, 800_000, 2_300_000],
        ],
        deposits: 'both',
    }),
    referendum({
        index: 8,
        track: '31',
        origin: 'MediumSpender',
        submitter: 14,
        title: 'Waiting a week for a decision deposit with votes already in',
        ...spend(300_000, account(15)),
        steps: [step('Referenda.Submitted', 940_000, 5)],
        history: [
            [940_300, 600_000, 0, 500_000],
            [955_000, 1_400_000, 300_000, 1_100_000],
            [990_000, 2_100_000, 300_000, 1_700_000],
        ],
        deposits: 'submission',
    }),
    referendum({
        index: 7,
        track: '30',
        origin: 'SmallSpender',
        submitter: 13,
        title: 'Submitted with no decision deposit and no votes yet, carrying a deliberately long title that the list row truncates and the detail header wraps across several lines',
        ...spend(8000, account(13)),
        steps: [step('Referenda.Submitted', 999_400, 4)],
        deposits: 'submission',
    }),
    referendum({
        index: 6,
        track: '31',
        origin: 'MediumSpender',
        submitter: 11,
        title: 'Confirming with approval and support both above their curves',
        ...spend(600000, account(12)),
        steps: [
            step('Referenda.Submitted', 960_000, 3),
            step('Referenda.DecisionDepositPlaced', 960_010, 2),
            step('Referenda.DecisionStarted', 961_440, 0),
            step('Referenda.ConfirmStarted', 990_000, 0),
        ],
        decidingSince: 961_440,
        confirmingSince: 990_000,
        history: [
            [960_030, 1_200_000, 0, 900_000],
            [960_900, 2_000_000, 600_000, 1_500_000],
            [961_440, 2_000_000, 600_000, 1_500_000],
            [975_000, 4_000_000, 600_000, 3_000_000],
            [989_990, 5_100_000, 600_000, 3_900_000],
        ],
        deposits: 'both',
    }),
    referendum({
        index: 5,
        track: '32',
        origin: 'BigSpender',
        submitter: 9,
        title: 'Deciding with approval and support both below their curves',
        ...spend(2_500_000, account(10)),
        steps: [
            step('Referenda.Submitted', 950_000, 6),
            step('Referenda.DecisionDepositPlaced', 950_200, 4),
            step('Referenda.DecisionStarted', 951_440, 0),
        ],
        decidingSince: 951_440,
        history: [
            [950_500, 800_000, 0, 600_000],
            [951_440, 800_000, 0, 600_000],
            [962_000, 1_500_000, 1_900_000, 1_000_000],
            [980_000, 2_800_000, 1_900_000, 1_400_000],
        ],
        deposits: 'both',
    }),
    referendum({
        index: 4,
        track: '32',
        origin: 'BigSpender',
        submitter: 8,
        status: 'Killed',
        title: 'Killed while deciding with both deposits slashed',
        ...spend(9_000_000, account(8)),
        steps: [
            step('Referenda.Submitted', 760_000, 5),
            step('Referenda.DecisionDepositPlaced', 760_050, 3),
            step('Referenda.DecisionStarted', 761_440, 0),
            step('Referenda.Killed', 790_000, 2),
            step('Referenda.DepositSlashed', 790_000, 3),
            step('Referenda.DepositSlashed', 790_000, 4),
        ],
        decidingSince: 761_440,
        endedAt: 790_000,
        history: [
            [760_200, 200_000, 0, 150_000],
            [761_440, 200_000, 0, 150_000],
            [775_000, 200_000, 4_100_000, 150_000],
            [790_000, 200_000, 4_100_000, 150_000],
        ],
    }),
    referendum({
        index: 3,
        track: '2',
        origin: 'WishForChange',
        submitter: 7,
        status: 'TimedOut',
        title: null,
        proposalPallet: 'System',
        proposalMethod: 'remark',
        proposalArgs: {remark: hex('Ship a native mobile wallet')},
        proposalCalls: [{pallet: 'System', method: 'remark', depth: 0}],
        steps: [
            step('Referenda.Submitted', 700_000, 3),
            step('Referenda.TimedOut', 820_960, 0),
            step('Referenda.SubmissionDepositRefunded', 830_000, 1),
        ],
        endedAt: 820_960,
        history: [[820_960, 0, 0, 0]],
    }),
    referendum({
        index: 2,
        track: '10',
        origin: 'IdentityAdmin',
        submitter: 6,
        status: 'Cancelled',
        title: 'Cancelled non-spend proposal with both deposits refunded',
        proposalPallet: 'Identity',
        proposalMethod: 'add_registrar',
        proposalArgs: {account: {__kind: 'Id', value: account(5)}},
        proposalCalls: [{pallet: 'Identity', method: 'add_registrar', depth: 0}],
        steps: [
            step('Referenda.Submitted', 640_000, 4),
            step('Referenda.DecisionDepositPlaced', 640_100, 2),
            step('Referenda.DecisionStarted', 640_720, 0),
            step('Referenda.Cancelled', 652_000, 1),
            step('Referenda.SubmissionDepositRefunded', 653_000, 5),
            step('Referenda.DecisionDepositRefunded', 653_000, 6),
        ],
        decidingSince: 640_720,
        endedAt: 652_000,
        history: [
            [640_300, 300_000, 0, 250_000],
            [640_720, 300_000, 0, 250_000],
            [645_000, 300_000, 100_000, 250_000],
            [652_000, 300_000, 100_000, 250_000],
        ],
    }),
    referendum({
        index: 1,
        track: '31',
        origin: 'MediumSpender',
        submitter: 3,
        status: 'Rejected',
        title: 'Rejected at the end of the decision period with nays ahead',
        ...spend(450_000, account(4)),
        steps: [
            step('Referenda.Submitted', 300_000, 2),
            step('Referenda.DecisionDepositPlaced', 300_400, 6),
            step('Referenda.DecisionStarted', 301_440, 0),
            step('Referenda.Rejected', 543_360, 0),
            step('Referenda.SubmissionDepositRefunded', 545_000, 2),
            step('Referenda.DecisionDepositRefunded', 545_000, 3),
        ],
        decidingSince: 301_440,
        endedAt: 543_360,
        history: [
            [300_600, 500_000, 0, 400_000],
            [301_440, 500_000, 0, 400_000],
            [350_000, 900_000, 1_200_000, 700_000],
            [500_000, 900_000, 2_400_000, 700_000],
            [543_360, 900_000, 2_400_000, 700_000],
        ],
    }),
    referendum({
        index: 0,
        track: '30',
        origin: 'SmallSpender',
        submitter: 1,
        status: 'Approved',
        title: 'Approved through confirm and enactment with both deposits refunded',
        ...spend(12_000, account(2)),
        steps: [
            step('Referenda.Submitted', 520_000, 7),
            step('Referenda.DecisionDepositPlaced', 520_060, 5),
            step('Referenda.DecisionStarted', 521_440, 0),
            step('Referenda.ConfirmStarted', 580_000, 0),
            step('Referenda.Confirmed', 588_640, 0),
            step('Referenda.Approved', 588_640, 1),
            step('Scheduler.Dispatched', 597_280, 0),
            step('Referenda.SubmissionDepositRefunded', 600_000, 3),
            step('Referenda.DecisionDepositRefunded', 600_000, 4),
        ],
        decidingSince: 521_440,
        confirmingSince: 580_000,
        endedAt: 588_640,
        history: [
            [520_100, 1_000_000, 0, 800_000],
            [521_440, 1_000_000, 0, 800_000],
            [540_000, 2_000_000, 400_000, 1_600_000],
            [579_000, 3_200_000, 400_000, 2_600_000],
            [588_640, 3_200_000, 400_000, 2_600_000],
        ],
    }),
]

export const referendaCount = rows => ({where}) => ({totalCount: rows.filter(r => !where?.status_eq || r.status === where.status_eq).length})

export default {
    chainInfos: [{
        name: 'Numen Mainnet',
        symbol: 'NUMN',
        decimals: 18,
        ss58: 14240,
        blockTime: BLOCK_TIME,
        existentialDeposit: '0',
        evmChainId: 32026,
        nativeErc20: '0x0000000000000000000000000000000000000802',
        sessionLength: 60,
        sessionOffset: 0,
        voteLockingPeriod: 60480,
        submissionDeposit: SUBMISSION_DEPOSIT,
        treasuryAccount: '0x6d6f646c70792f74727372790000000000000000000000000000000000000000',
        head: HEAD,
        finalizedHead: HEAD - 5,
    }],
    blocks: () => [{height: HEAD, timestamp: new Date().toISOString()}],
    dailyStats: [{
        issuanceTotal: ISSUANCE_TOTAL,
        issuanceInactive: ISSUANCE_INACTIVE,
        treasuryPot: '550000154663232139351368277',
    }],
    tracks,
    tracksConnection: {totalCount: tracks.length},
    referendums: ({where}) => (where?.index_eq == null ? referenda : referenda.filter(r => r.index === where.index_eq)),
    referendumsConnection: referendaCount(referenda),
    referendumTallySnapshots: ({where}) => referenda.find(r => r.index === where.referendum.index_eq).snapshots,
    events: ({where}) => (where?.id_in ?? []).map(id => ({id, indexInBlock: Number(/-(\d+)$/.exec(id)?.[1] ?? 0)})),
}
