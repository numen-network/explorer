const HEAD = 1_000_000
const HEAD_TIME = Date.now()
const BLOCK_TIME = 10
const SUBMISSION_DEPOSIT = '5000000000000000000'

const at = height => new Date(HEAD_TIME - (HEAD - height) * BLOCK_TIME * 1000).toISOString()
const numn = n => (BigInt(n) * 10n ** 18n).toString()
const account = n => '0x' + ('a' + n.toString(16)).repeat(32)
const hash = n => '0x' + ('c' + n.toString(16)).repeat(32)
const hex = text => '0x' + Buffer.from(text).toString('hex')

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

function referendum({index, track, origin, submitter, steps, decidingSince = null, confirmingSince = null, endedAt = null, tally: [ayes, nays, support], deposits, ...rest}) {
    const t = trackById[track]
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
        ...rest,
    }
}

const referenda = [
    referendum({
        index: 7,
        track: '30',
        origin: 'SmallSpender',
        submitter: 13,
        title: 'Submitted with no decision deposit and no votes yet, carrying a deliberately long title that the list row truncates and the detail header wraps across several lines',
        ...spend(8000, account(13)),
        steps: [step('Referenda.Submitted', 999_400, 4)],
        tally: [0, 0, 0],
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
        tally: [5_100_000, 600_000, 3_900_000],
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
        tally: [2_800_000, 1_900_000, 1_400_000],
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
        tally: [200_000, 4_100_000, 150_000],
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
        tally: [0, 0, 0],
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
        tally: [300_000, 100_000, 250_000],
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
        tally: [900_000, 2_400_000, 700_000],
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
        tally: [3_200_000, 400_000, 2_600_000],
    }),
]

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
        issuanceTotal: '602518848000000000000000000',
        issuanceInactive: '550000154663232139351368277',
        treasuryPot: '550000154663232139351368277',
    }],
    tracks,
    tracksConnection: {totalCount: tracks.length},
    referendums: ({where}) => (where?.index_eq == null ? referenda : referenda.filter(r => r.index === where.index_eq)),
    referendumsConnection: ({where}) => ({totalCount: referenda.filter(r => !where?.status_eq || r.status === where.status_eq).length}),
    events: ({where}) => (where?.id_in ?? []).map(id => ({id, indexInBlock: Number(/-(\d+)$/.exec(id)?.[1] ?? 0)})),
}
