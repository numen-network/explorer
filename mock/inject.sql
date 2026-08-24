-- synthetic governance and identity rows on top of the cloned testnet index
-- covers every referendum status, every judgement state, the no identity
-- case and sub identity specimens in the parent slash sub display form
-- heights are offsets below the chain tip so block links and timestamps resolve

\set ON_ERROR_STOP on

-- the clone has to come from a freshly migrated index, the fixture adds rows
-- and never patches schema

SELECT max(height) AS h FROM block \gset
SELECT coalesce(max(index) + 1, 0) AS base FROM referendum \gset

-- every row below sits at a fixed offset under the tip, a short clone would put
-- them at negative heights and the rows that join block would vanish in silence
DO $$ BEGIN
    IF (SELECT max(height) FROM block) < 60000 THEN
        RAISE EXCEPTION 'clone holds % blocks, the fixture offsets need 60000', (SELECT max(height) FROM block);
    END IF;
END $$;

CREATE FUNCTION pg_temp.pk(n int) RETURNS text LANGUAGE sql IMMUTABLE
    AS $$ SELECT '0x' || repeat('aa', 31) || lpad(to_hex(10 + n), 2, '0') $$;

CREATE FUNCTION pg_temp.raw(t text) RETURNS jsonb LANGUAGE sql IMMUTABLE
    AS $$ SELECT jsonb_build_object('__kind', 'Raw' || length(convert_to(t, 'UTF8')), 'value', '0x' || encode(convert_to(t, 'UTF8'), 'hex')) $$;

CREATE FUNCTION pg_temp.idjson(name text, judge text) RETURNS jsonb LANGUAGE sql IMMUTABLE
    AS $$ SELECT jsonb_build_object(
        'info', jsonb_build_object(
            'display', pg_temp.raw(name),
            'web', '{"__kind": "None"}'::jsonb, 'email', '{"__kind": "None"}'::jsonb,
            'matrix', '{"__kind": "None"}'::jsonb, 'github', '{"__kind": "None"}'::jsonb,
            'x', '{"__kind": "None"}'::jsonb, 'telegram', '{"__kind": "None"}'::jsonb,
            'discord', '{"__kind": "None"}'::jsonb),
        'deposit', '5410000000000000000',
        'judgements', CASE WHEN judge IS NULL THEN '[]'::jsonb
            ELSE jsonb_build_array(jsonb_build_array(0, jsonb_build_object('__kind', judge))) END) $$;

\set P '1000000000000000000::numeric'

INSERT INTO account (id, free, reserved, frozen, nonce, first_seen_block, last_active_block, identity_display, identity_json)
SELECT pg_temp.pk(n), numn * :P, 0, 0, n * 3, :h - 30000, :h - 500 * n,
       name, CASE WHEN name IS NULL THEN NULL ELSE pg_temp.idjson(name, judge) END
FROM (VALUES
    (1, 'Polaris Guild', 'KnownGood',  850000),
    (2, 'Orbit Labs',    'Reasonable', 420000),
    (3, 'Redshift',      'OutOfDate',   96000),
    (4, 'Nova Fund',     'FeePaid',   1200000),
    (5, 'Spamlord',      'Erroneous',    3000),
    (6, 'Muddy Waters',  'LowQuality',  57000),
    (7, NULL,            NULL,        4200000),
    (8, NULL, NULL, 15000),
    (9, NULL, NULL,  9000),
    (10, NULL, NULL,  1200),
    (11, NULL, NULL, 250000)
) v(n, name, judge, numn);

-- sub identities carry no registration of their own, label and judgement
-- resolve through the super relation in the web layer
UPDATE account SET identity_super_id = pg_temp.pk(p), identity_sub_name = sub
FROM (VALUES (8, 1, 'payouts'), (9, 1, 'ops'), (10, 4, 'intern')) v(n, p, sub)
WHERE id = pg_temp.pk(n);

UPDATE account SET username = uname
FROM (VALUES (2, 'orbit'), (7, 'whale')) v(n, uname)
WHERE id = pg_temp.pk(n);

INSERT INTO prime_state (id, since, account_id) VALUES ('prime', :h - 61000, pg_temp.pk(1));

-- give the two busiest real miners an identity so block and transfer pages show badges
UPDATE account SET identity_display = 'Foundry', identity_json = pg_temp.idjson('Foundry', 'Reasonable')
WHERE id = (SELECT author_id FROM block WHERE author_id IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC LIMIT 1);
UPDATE account SET identity_display = 'Hydra Pool', identity_json = pg_temp.idjson('Hydra Pool', 'KnownGood')
WHERE id = (SELECT author_id FROM block WHERE author_id IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC LIMIT 1 OFFSET 1);

INSERT INTO referendum (id, index, track_id, origin, proposal_hash, title, description,
                        proposal_call, proposal_amount, proposal_beneficiary,
                        submitter_id, submitted_at, status, deciding_since, confirming_since, ended_at,
                        ayes, nays, support, timeline)
SELECT (:base + n)::text, :base + n, track, origin,
       '0x' || md5(n::text) || md5(origin), title, descr,
       pcall, amtk * :P, CASE WHEN benef IS NULL THEN NULL ELSE pg_temp.pk(benef) END,
       pg_temp.pk(1 + n % 6), :h - sub, status,
       CASE WHEN dec  IS NULL THEN NULL ELSE :h - dec  END,
       CASE WHEN conf IS NULL THEN NULL ELSE :h - conf END,
       CASE WHEN fin  IS NULL THEN NULL ELSE :h - fin  END,
       ayesk * :P, naysk * :P, supk * :P,
       jsonb_build_array(jsonb_build_object('block', :h - sub, 'status', 'submitted'))
           || CASE WHEN dec  IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('block', :h - dec,  'status', 'deciding'))   END
           || CASE WHEN conf IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('block', :h - conf, 'status', 'confirming')) END
           || CASE WHEN fin  IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('block', :h - fin,  'status', lower(status))) END
FROM (VALUES
    (0, '0', 'SmallSpender',  'APPROVED',   'Fund the winter hackathon',
        E'Three day onsite event, 40 builders.\n\nBudget covers venue, travel grants and bounties. Receipts will be published after settlement.',
        'treasury.spendLocal', 12000::numeric, 2, 52000, 50000, 42000, 40000, 380000, 20000, 310000),
    (1, '0', 'SmallSpender',  'REJECTED',   'Marketing retainer for Q3',
        'Monthly retainer for a growth agency. No deliverables listed.',
        'treasury.spendLocal', 45000, 5, 48000, 46000, NULL, 38000, 90000, 260000, 120000),
    (2, '1', 'MediumSpender', 'APPROVED',   'Explorer infrastructure grant',
        E'Covers 12 months of archive node hosting, database storage and monitoring for the public explorer.\n\nPaid in one tranche to the ops multisig.',
        'treasury.spendLocal', 180000, 1, 45000, 43000, 34000, 32000, 520000, 40000, 450000),
    (3, '0', 'SmallSpender',  'TIMEDOUT',   NULL, NULL,
        'system.remark', NULL, NULL, 40000, NULL, NULL, 9000, 0, 0, 0),
    (4, '1', 'MediumSpender', 'CANCELLED',  'Bridge audit budget',
        'Withdrawn by the submitter, superseded by a revised scope.',
        'treasury.spendLocal', 95000, 4, 30000, 28000, NULL, 26000, 150000, 30000, 90000),
    (5, '2', 'BigSpender',    'KILLED',     'Buy the dip with treasury',
        'Convert a third of the pot into exchange tokens.',
        'treasury.spendLocal', 900000, 6, 24000, 22000, NULL, 21500, 10000, 700000, 30000),
    (6, '0', 'SmallSpender',  'DECIDING',   'Community meetup sponsorship',
        'Recurring city meetups, six locations, swag and streaming gear.',
        'treasury.spendLocal', 8000, 3, 26000, 24000, NULL, NULL, 120000, 210000, 95000),
    (7, '1', 'MediumSpender', 'CONFIRMING', 'Node operator rebate program',
        E'Rebates archive node operators for bandwidth, metered monthly.\n\nFirst cohort of nine operators, addresses attached in the linked sheet.',
        'treasury.spendLocal', 60000, 2, 60000, 58000, 3000, NULL, 640000, 55000, 510000),
    (8, '2', 'BigSpender',    'SUBMITTED',  'Treasury diversification into a strategic reserve of obsidian asteroids with an unnecessarily long title to test overflow behaviour',
        'Stress test row for layout, wraps and truncation.',
        'treasury.spendLocal', 2500000, 1, 1500, NULL, NULL, NULL, 0, 0, 0)
) v(n, track, origin, status, title, descr, pcall, amtk, benef, sub, dec, conf, fin, ayesk, naysk, supk);

INSERT INTO vote (id, referendum_id, voter_id, decision, conviction, amount, block, removed)
SELECT (:base + refn)::text || '-' || pg_temp.pk(voter), (:base + refn)::text, pg_temp.pk(voter),
       decision, conviction, amtk * :P, :h - blk, false
FROM (VALUES
    (6, 1, 'aye',     '2x', 40000, 20000),
    (6, 2, 'nay',     '1x', 120000, 18000),
    (6, 5, 'nay',     '3x', 60000, 15000),
    (6, 4, 'abstain', NULL, 25000, 12000),
    (6, 8, 'aye',     '1x', 15000, 9000),
    (7, 10, 'nay',    '1x', 1200, 5000),
    (7, 1, 'aye',     '1x', 300000, 30000),
    (7, 2, 'aye',     '2x', 250000, 25000),
    (7, 6, 'nay',     '1x', 45000, 8000),
    (2, 1, 'aye',     '2x', 400000, 44000)
) v(refn, voter, decision, conviction, amtk, blk);

-- pk(11) plays a 3 of 4 multisig of pk(1) pk(2) pk(4) pk(7)
INSERT INTO multisig_op (id, call_hash, approvals, threshold, signatories, status, result, created_block, updated_block, multisig_id, depositor_id)
SELECT pg_temp.pk(11) || '-' || ch || '-' || (:h - cre) || '-1', ch,
       (SELECT array_agg(pg_temp.pk(a)) FROM unnest(appr) a), 3,
       ARRAY[pg_temp.pk(1), pg_temp.pk(2), pg_temp.pk(4), pg_temp.pk(7)],
       status, res, :h - cre, :h - upd, pg_temp.pk(11), pg_temp.pk(dep)
FROM (VALUES
    ('0x' || md5('ms1') || md5('op1'), ARRAY[1, 2, 4], 'executed', 'ok', 9000, 8600, 1),
    ('0x' || md5('ms2') || md5('op2'), ARRAY[4, 7], 'pending', NULL, 2400, 1200, 4),
    ('0x' || md5('ms3') || md5('op3'), ARRAY[2], 'cancelled', NULL, 16000, 15000, 2)
) v(ch, appr, status, res, cre, upd, dep);

INSERT INTO proxy_relation (id, delegator_id, delegatee_id, proxy_type, delay)
SELECT pg_temp.pk(dg) || '-' || pg_temp.pk(de) || '-' || ptype, pg_temp.pk(dg), pg_temp.pk(de), ptype, delay
FROM (VALUES
    (4, 2, 'Governance', 0),
    (4, 7, 'Any', 50),
    (1, 2, 'NonTransfer', 0)
) v(dg, de, ptype, delay);

-- negative offsets put unlock and update deadlines in the future
INSERT INTO bounty (id, index, value, fee, description, status, unlock_at, update_due, payout,
                    created_at, updated_at, timeline, proposer_id, curator_id, beneficiary_id)
SELECT n::text, n, valk * :P, feek * :P, descr, status,
       CASE WHEN unlk IS NULL THEN NULL ELSE :h - unlk END,
       CASE WHEN dued IS NULL THEN NULL ELSE :h - dued END,
       payk * :P, :h - cre, :h - upd,
       (SELECT jsonb_agg(jsonb_build_object('status', s, 'block', :h - o) ORDER BY ord)
          FROM unnest(stats, offs) WITH ORDINALITY AS t(s, o, ord)),
       pg_temp.pk(prop),
       CASE WHEN cur IS NULL THEN NULL ELSE pg_temp.pk(cur) END,
       CASE WHEN ben IS NULL THEN NULL ELSE pg_temp.pk(ben) END
FROM (VALUES
    (0, 'Port the wallet to mobile', 40000::numeric, 2000::numeric, 'claimed', NULL::int, NULL::int, 38000::numeric,
        40000, 20000, ARRAY['proposed','approved','funded','curator proposed','curator accepted','awarded','claimed'],
        ARRAY[40000,38000,36000,35000,34000,22000,20000], 2, 2::int, 9::int),
    (1, 'Explorer performance audit', 90000, 5000, 'active', NULL, -80000, NULL,
        30000, 15000, ARRAY['proposed','approved','funded','curator proposed','curator accepted'],
        ARRAY[30000,28000,26000,17000,15000], 1, 1, NULL),
    (2, 'Numen brand illustration pack', 25000, 1500, 'pending_payout', -5000, NULL, NULL,
        20000, 800, ARRAY['proposed','approved','funded','curator proposed','curator accepted','awarded'],
        ARRAY[20000,18000,16000,10000,9000,800], 2, 4, 10),
    (3, 'Testnet faucet maintenance', 15000, NULL, 'funded', NULL, NULL, NULL,
        8000, 4000, ARRAY['proposed','approved','funded'], ARRAY[8000,6000,4000], 3, NULL, NULL),
    (4, 'Translate the docs into five languages', 30000, NULL, 'proposed', NULL, NULL, NULL,
        2000, 2000, ARRAY['proposed'], ARRAY[2000], 3, NULL, NULL),
    (5, 'Buy a yacht for team morale', 500000, NULL, 'rejected', NULL, NULL, NULL,
        26000, 25000, ARRAY['proposed','rejected'], ARRAY[26000,25000], 5, NULL, NULL)
) v(n, descr, valk, feek, status, unlk, dued, payk, cre, upd, stats, offs, prop, cur, ben);

INSERT INTO child_bounty (id, child_index, value, fee, description, status, payout, created_at, updated_at, parent_id, curator_id, beneficiary_id)
SELECT '1-' || cn, cn, valk * :P, feek * :P, descr, status, payk * :P, :h - cre, :h - upd, '1',
       CASE WHEN cur IS NULL THEN NULL ELSE pg_temp.pk(cur) END,
       CASE WHEN ben IS NULL THEN NULL ELSE pg_temp.pk(ben) END
FROM (VALUES
    (0, 'Profile the squid processor', 12000::numeric, 500::numeric, 'claimed', 12000::numeric, 14000, 12000, 1::int, 8::int),
    (1, 'Optimize table rendering', 8000, 400, 'active', NULL, 13000, 11000, 4, NULL),
    (2, 'Write regression benchmarks', 6000, NULL, 'added', NULL, 10000, 10000, NULL, NULL)
) v(cn, descr, valk, feek, status, payk, cre, upd, cur, ben);

-- two approved referenda enacted a spend, two carried an approve_bounty call
UPDATE treasury_spend SET referendum_id = (:base + v.n)::text
FROM (VALUES (900, 0), (901, 2)) v(sp, n)
WHERE treasury_spend.id = 'local-' || v.sp;

UPDATE referendum SET proposal_call = 'bounties.approveBounty', proposal_bounty_index = v.b,
    proposal_amount = NULL, proposal_beneficiary = NULL
FROM (VALUES (1, 0), (4, 1)) v(n, b)
WHERE referendum.id = (:base + v.n)::text;

UPDATE bounty SET referendum_id = (:base + v.n)::text
FROM (VALUES (0, 1), (1, 4)) v(b, n)
WHERE bounty.index = v.b;

INSERT INTO delegation (id, who_id, target_id, track_id, conviction, balance, block)
SELECT pg_temp.pk(who) || '-' || track, pg_temp.pk(who), pg_temp.pk(tgt), track, conv, amtk * :P, :h - blk
FROM (VALUES
    (9, 1, '0', '2x', 50000::numeric, 7000),
    (7, 4, '1', '1x', 500000, 12000),
    (3, 1, '0', '3x', 30000, 3000)
) v(who, tgt, track, conv, amtk, blk);

-- a delegate with a real following on two tracks, enough to exercise the
-- track filter, the paged list and the trimmed panel on the referendum page
INSERT INTO delegation (id, who_id, target_id, track_id, conviction, balance, block)
SELECT 'seed-' || a.id || '-' || t.track, a.id, pg_temp.pk(1), t.track, '1x', (1000 + a.n) * :P, :h - 9000
FROM (SELECT id, row_number() OVER (ORDER BY id) AS n FROM account
      WHERE id <> pg_temp.pk(1) AND id NOT IN (SELECT who_id FROM delegation) ORDER BY id LIMIT 30) a
CROSS JOIN (VALUES ('0', 30), ('2', 12)) t(track, take)
WHERE a.n <= t.take
ON CONFLICT (id) DO NOTHING;

INSERT INTO treasury_spend (id, kind, beneficiary_id, amount, status, block)
SELECT 'local-' || (900 + n), kind, pg_temp.pk(benef), amtk * :P, status, :h - blk
FROM (VALUES
    (0, 'local', 2, 12000::numeric, 'paid', 40000),
    (1, 'local', 1, 180000, 'paid', 32000),
    (2, 'local', 2, 60000, 'approved', 500),
    (3, 'spend', 4, 75000, 'approved', 300),
    (4, 'local', 8, 4000, 'paid', 200)
) v(n, kind, benef, amtk, status, blk);

-- chain identity comes with the clone, only the heads move so the fixture
-- rows just under them read as recent
UPDATE chain_info SET head = :h + 100, finalized_head = :h + 97 WHERE id = 'chain';

-- one identity with every channel filled so the identity card shows a populated case
UPDATE account SET identity_json = identity_json || jsonb_build_object('info',
    (identity_json -> 'info') || jsonb_build_object(
        'web', pg_temp.raw('https://orbitlabs.example'),
        'email', pg_temp.raw('hello@orbitlabs.example'),
        'matrix', pg_temp.raw('@orbit:matrix.org'),
        'github', pg_temp.raw('orbit-labs'),
        'x', pg_temp.raw('@orbit_labs'),
        'telegram', pg_temp.raw('@orbitlabs'),
        'discord', pg_temp.raw('orbitlabs')))
WHERE id = pg_temp.pk(2);

UPDATE account SET identity_json = identity_json || jsonb_build_object('info',
    (identity_json -> 'info') || jsonb_build_object(
        'web', pg_temp.raw('https://polaris.example'),
        'email', pg_temp.raw('guild@polaris.example'),
        'matrix', pg_temp.raw('@polaris:matrix.org'),
        'github', pg_temp.raw('polaris-guild'),
        'x', pg_temp.raw('@polaris_guild'),
        'telegram', pg_temp.raw('@polarisguild'),
        'discord', pg_temp.raw('polarisguild')))
WHERE id = pg_temp.pk(1);

-- a partially filled one, most registrations never fill every channel
UPDATE account SET identity_json = identity_json || jsonb_build_object('info',
    (identity_json -> 'info') || jsonb_build_object(
        'email', pg_temp.raw('grants@novafund.example'),
        'github', pg_temp.raw('nova-fund'),
        'x', pg_temp.raw('@nova_fund')))
WHERE id = pg_temp.pk(4);

-- a spread of registrar judgements on one identity so the card shows the mix
UPDATE account SET identity_json = jsonb_set(identity_json, '{judgements}', jsonb_build_array(
    jsonb_build_array(0, '{"__kind": "KnownGood"}'::jsonb),
    jsonb_build_array(1, '{"__kind": "Reasonable"}'::jsonb),
    jsonb_build_array(2, '{"__kind": "OutOfDate"}'::jsonb),
    jsonb_build_array(3, jsonb_build_object('__kind', 'FeePaid', 'value', '2500000000000000000')),
    jsonb_build_array(4, '{"__kind": "LowQuality"}'::jsonb)))
WHERE id = pg_temp.pk(1);

-- ERC20 specimens. The mock has no evm chain behind it, so the extrinsic,
-- transaction and log rows the token pages read through are written here too.
-- Supply, balances and counts are derived from the transfer rows at the end so
-- the fixture reports what a real indexer would compute, not a typed guess.

\set ZERO '0x0000000000000000000000000000000000000000'
\set XFER '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
\set APPROVAL '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'

CREATE FUNCTION pg_temp.h160(seed text) RETURNS text LANGUAGE sql IMMUTABLE
    AS $$ SELECT '0x' || substr(md5(seed) || md5(seed || '~'), 1, 40) $$;

CREATE FUNCTION pg_temp.h256(seed text) RETURNS text LANGUAGE sql IMMUTABLE
    AS $$ SELECT '0x' || md5(seed) || md5(seed || '~') $$;

-- an abi word, 32 bytes of bare hex. to_hex stops at bigint, token amounts do not
CREATE FUNCTION pg_temp.word(v numeric) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE out text := ''; n numeric := trunc(v);
BEGIN
    WHILE n > 0 LOOP
        out := substr('0123456789abcdef', (mod(n, 16) + 1)::int, 1) || out;
        n := div(n, 16);
    END LOOP;
    RETURN lpad(coalesce(nullif(out, ''), '0'), 64, '0');
END $$;

CREATE FUNCTION pg_temp.pad(addr text) RETURNS text LANGUAGE sql IMMUTABLE
    AS $$ SELECT repeat('0', 24) || substr(addr, 3) $$;

-- token 5 has no create tx, a factory built it from inside another contract and
-- frontier reports no Executed event for that, so the deploy block stays unknown
CREATE TEMP TABLE mock_token AS
SELECT n, pg_temp.h160('token' || n) AS addr, nm, sym, dec
FROM (VALUES
    (1, 'Numen USD'::text,   'nUSD'::text,  6::int),
    (2, 'Wrapped NUMN',      'WNUMN',      18),
    (3, 'Asteroid Shards',   'SHARD',      18),
    (4, NULL,                NULL,        NULL),
    (5, 'Numen LP nUSD-WNUMN', 'nUSD-LP',  18)
) v(n, nm, sym, dec);

-- src null mints, dst null burns, two rows on one tx make a router swap
CREATE TEMP TABLE mock_xfer AS
SELECT v.tx, v.tok, v.ord, v.amount,
       CASE WHEN v.src IS NULL THEN :'ZERO' ELSE pg_temp.h160(v.src) END AS src,
       CASE WHEN v.dst IS NULL THEN :'ZERO' ELSE pg_temp.h160(v.dst) END AS dst
FROM (VALUES
    ( 5, 1, 0, NULL::text, 'holder1'::text, 5000000e6::numeric),
    ( 6, 2, 0, NULL,       'holder1',        120000e18),
    ( 7, 3, 0, NULL,       'holder2',       1000000e18),
    ( 8, 4, 0, NULL,       'holder3',         21000000),
    ( 9, 1, 0, 'holder1',  'holder2',         250000e6),
    (10, 1, 0, 'holder1',  'holder3',      120500.25e6),
    (11, 1, 0, 'holder2',  'holder4',          75000e6),
    (12, 2, 0, 'holder1',  'holder6',         40000e18),
    (13, 2, 0, 'holder1',  'pool',             8000e18),
    (14, 1, 0, 'holder3',  'holder5',          10000e6),
    (15, 3, 0, 'holder2',  'holder8',        250000e18),
    (16, 1, 0, 'holder4',  'pool',            5250.5e6),
    (16, 2, 1, 'pool',     'holder4',            12.5e18),
    (17, 2, 0, 'holder6',  'holder7',     12345.678e18),
    (18, 1, 0, 'holder5',  NULL,               2000e6),
    (19, 3, 0, 'holder2',  'holder5',         40000e18),
    (20, 4, 0, 'holder3',  'holder1',                3),
    (24, 5, 0, NULL,       'holder1',          1200e18),
    (25, 5, 0, 'holder1',  'holder6',           300e18)
) v(tx, tok, ord, src, dst, amount);

CREATE TEMP TABLE mock_evm_tx AS
SELECT v.n, pg_temp.h256('evmtx' || v.n) AS hash, b.id AS block_id, b.height, b.timestamp AS ts,
       pg_temp.h160(v.sender) AS src,
       CASE WHEN v.dest IS NULL THEN NULL ELSE pg_temp.h160(v.dest) END AS dest,
       CASE WHEN v.creates IS NULL THEN NULL ELSE pg_temp.h160(v.creates) END AS creates,
       v.val, v.sel, v.raw, v.gas, v.tx_type, v.status, v.reason,
       row_number() OVER (PARTITION BY v.sender ORDER BY v.blk DESC) - 1 AS nonce
FROM (VALUES
    ( 1, 'deployer'::text, NULL::text, 'token1'::text, 0::numeric, NULL::text, NULL::text, 1452000::numeric, 0, 'Succeed'::text, NULL::text, 56000),
    ( 2, 'deployer', NULL,      'token2', 0, NULL, NULL, 1288000, 0, 'Succeed', NULL, 53000),
    ( 3, 'deployer', NULL,      'token3', 0, NULL, NULL, 1104000, 2, 'Succeed', NULL, 51000),
    ( 4, 'deployer', NULL,      'token4', 0, NULL, NULL,  986000, 0, 'Succeed', NULL, 48000),
    ( 5, 'deployer', 'token1',  NULL,     0, '0x40c10f19', NULL,   68142, 0, 'Succeed', NULL, 55000),
    ( 6, 'deployer', 'token2',  NULL,     0, '0x40c10f19', NULL,   68142, 0, 'Succeed', NULL, 52000),
    ( 7, 'deployer', 'token3',  NULL,     0, '0x40c10f19', NULL,   68142, 2, 'Succeed', NULL, 50000),
    ( 8, 'deployer', 'token4',  NULL,     0, '0x40c10f19', NULL,   51042, 0, 'Succeed', NULL, 47000),
    ( 9, 'holder1',  'token1',  NULL,     0, '0xa9059cbb', NULL,   51823, 2, 'Succeed', NULL, 44000),
    (10, 'holder1',  'token1',  NULL,     0, '0xa9059cbb', NULL,   34723, 2, 'Succeed', NULL, 41000),
    (11, 'holder2',  'token1',  NULL,     0, '0xa9059cbb', NULL,   51823, 0, 'Succeed', NULL, 37000),
    (12, 'holder1',  'token2',  NULL,     0, '0xa9059cbb', NULL,   51823, 2, 'Succeed', NULL, 36000),
    (13, 'holder1',  'token2',  NULL,     0, '0xa9059cbb', NULL,   34723, 2, 'Succeed', NULL, 30000),
    (14, 'holder3',  'token1',  NULL,     0, '0xa9059cbb', NULL,   51823, 0, 'Succeed', NULL, 31000),
    (15, 'holder2',  'token3',  NULL,     0, '0xa9059cbb', NULL,   51823, 2, 'Succeed', NULL, 26000),
    (16, 'holder4',  'router',  NULL,     0, NULL, '0x38ed1739' || repeat(md5('swap'), 6), 147204, 2, 'Succeed', NULL, 22000),
    (17, 'holder6',  'token2',  NULL,     0, '0xa9059cbb', NULL,   34723, 0, 'Succeed', NULL, 18000),
    (18, 'holder5',  'token1',  NULL,     0, NULL, '0x42966c68' || pg_temp.word(2000e6), 38406, 2, 'Succeed', NULL, 14000),
    (19, 'holder2',  'token3',  NULL,     0, '0xa9059cbb', NULL,   34723, 2, 'Succeed', NULL, 6000),
    (20, 'holder3',  'token4',  NULL,     0, '0xa9059cbb', NULL,   51823, 0, 'Succeed', NULL, 2500),
    (21, 'holder2',  'token1',  NULL,     0, NULL, '0x095ea7b3' || pg_temp.pad(pg_temp.h160('holder4')) || pg_temp.word(1e30), 46212, 2, 'Succeed', NULL, 12000),
    (22, 'holder5',  'token1',  NULL,     0, NULL, '0xa9059cbb' || pg_temp.pad(pg_temp.h160('holder1')) || pg_temp.word(999999e6), 29104, 2, 'Revert', 'Reverted', 8000),
    (23, 'holder1',  'holder7', NULL, 2.5e18, NULL, '0x', 21000, 0, 'Succeed', NULL, 4000),
    (24, 'holder1',  'router',  NULL,     0, '0x40c10f19', NULL, 128740, 2, 'Succeed', NULL, 34000),
    (25, 'holder1',  'token5',  NULL,     0, '0xa9059cbb', NULL,  51823, 2, 'Succeed', NULL, 16000)
) v(n, sender, dest, creates, val, sel, raw, gas, tx_type, status, reason, blk)
JOIN block b ON b.height = :h - v.blk;

-- the input bytes are cosmetic, the selector the explorer indexes is not
ALTER TABLE mock_evm_tx ADD COLUMN input text;
UPDATE mock_evm_tx t SET input = coalesce(
    t.raw,
    CASE WHEN t.creates IS NOT NULL THEN '0x60806040' || repeat(md5('code' || t.n), 8) END,
    t.sel || (SELECT pg_temp.pad(x.dst) || pg_temp.word(x.amount) FROM mock_xfer x WHERE x.tx = t.n AND x.ord = 0),
    '0x');

INSERT INTO extrinsic (id, block_id, index_in_block, hash, pallet, method, success)
SELECT lpad(t.height::text, 10, '0') || '-' || substr(b.hash, 3, 5) || '-' || lpad(idx.n::text, 6, '0'),
       t.block_id, idx.n, pg_temp.h256('evmext' || t.n), 'Ethereum', 'transact', true
FROM mock_evm_tx t
JOIN block b ON b.id = t.block_id
CROSS JOIN LATERAL (SELECT count(*)::int AS n FROM extrinsic e WHERE e.block_id = t.block_id) idx;

INSERT INTO evm_transaction (id, extrinsic_id, block_id, tx_index, "from", "to", contract_address, value,
                             input, input_selector, nonce, gas_limit, gas_used, gas_price, tx_type,
                             status, status_reason, timestamp)
SELECT t.hash, e.id, t.block_id, 0, t.src, t.dest, t.creates, t.val,
       decode(substr(t.input, 3), 'hex'),
       CASE WHEN length(t.input) >= 10 THEN substr(t.input, 1, 10) END,
       t.nonce, ceil(t.gas * 1.4), t.gas,
       CASE WHEN t.tx_type = 2 THEN 1250000000 ELSE 1000000000 END,
       t.tx_type, t.status, t.reason, t.ts
FROM mock_evm_tx t
JOIN extrinsic e ON e.block_id = t.block_id AND e.pallet = 'Ethereum';

INSERT INTO call (id, extrinsic_id, block_id, address, pallet, method, success)
SELECT x.id || '-0', x.id, x.block_id, '{}'::int[], x.pallet, x.method, true
FROM evm_transaction v
JOIN extrinsic x ON x.id = v.extrinsic_id
WHERE v.id IN (SELECT hash FROM mock_evm_tx);

INSERT INTO evm_log (id, transaction_id, block_id, log_index, address, topic0, topics, data)
SELECT t.hash || '-' || lpad(x.ord::text, 4, '0'), t.hash, t.block_id, x.ord, k.addr,
       :'XFER', ARRAY[:'XFER', '0x' || pg_temp.pad(x.src), '0x' || pg_temp.pad(x.dst)],
       decode(pg_temp.word(x.amount), 'hex')
FROM mock_xfer x
JOIN mock_evm_tx t ON t.n = x.tx
JOIN mock_token k ON k.n = x.tok;

-- an approve leaves a log the token indexer must ignore
INSERT INTO evm_log (id, transaction_id, block_id, log_index, address, topic0, topics, data)
SELECT t.hash || '-0000', t.hash, t.block_id, 0, pg_temp.h160('token1'),
       :'APPROVAL', ARRAY[:'APPROVAL', '0x' || pg_temp.pad(pg_temp.h160('holder2')), '0x' || pg_temp.pad(pg_temp.h160('holder4'))],
       decode(pg_temp.word(1e30), 'hex')
FROM mock_evm_tx t WHERE t.n = 21;

INSERT INTO token (id, name, symbol, decimals, total_supply, holder_count, transfer_count, first_block, deploy_block)
SELECT k.addr, k.nm, k.sym, k.dec, 0, 0, 0, 0, t.height
FROM mock_token k
LEFT JOIN mock_evm_tx t ON t.creates = k.addr;

INSERT INTO token_transfer (id, token_id, transaction_id, block_id, "from", "to", amount, timestamp)
SELECT t.hash || '-' || lpad(x.ord::text, 4, '0'), k.addr, t.hash, t.block_id, x.src, x.dst, x.amount, t.ts
FROM mock_xfer x
JOIN mock_evm_tx t ON t.n = x.tx
JOIN mock_token k ON k.n = x.tok;

INSERT INTO token_holder (id, token_id, address, balance)
SELECT k.addr || '-' || h.who, k.addr, h.who, h.bal
FROM (SELECT tok, who, sum(delta) AS bal FROM (
        SELECT tok, dst AS who,  amount AS delta FROM mock_xfer
        UNION ALL
        SELECT tok, src AS who, -amount AS delta FROM mock_xfer) f
      WHERE who <> :'ZERO' GROUP BY tok, who) h
JOIN mock_token k ON k.n = h.tok;

UPDATE token SET total_supply = a.supply, transfer_count = a.cnt, first_block = a.first_block,
                 holder_count = (SELECT count(*) FROM token_holder hh WHERE hh.token_id = token.id AND hh.balance > 0)
FROM (SELECT k.addr,
             sum(CASE WHEN x.src = :'ZERO' THEN x.amount WHEN x.dst = :'ZERO' THEN -x.amount ELSE 0 END) AS supply,
             count(*) AS cnt, min(t.height) AS first_block
      FROM mock_xfer x JOIN mock_token k ON k.n = x.tok JOIN mock_evm_tx t ON t.n = x.tx
      GROUP BY k.addr) a
WHERE token.id = a.addr;

-- pallet_evm maps a sender to blake2_256("evm:" ++ H160), which postgres cannot
-- compute, so the pairs are precomputed from the same h160 seeds used above
INSERT INTO account (id, evm_address, free, reserved, frozen, nonce, first_seen_block, last_active_block)
SELECT m.acct, pg_temp.h160(m.seed), m.numn * :P, 0, 0, t.txs, t.first_blk, t.last_blk
FROM (VALUES
    ('deployer', '0xd3c8428d9f04979615822fd0c603c36c946a9c0fc335ceb830096fcf5be54020', 91000::numeric),
    ('holder1',  '0xe28fa28b89ac2a24d510af67a4c36ab599ff552597de785d063ba36b5b489146',  47000),
    ('holder2',  '0x6953562546761548cc9b486fcbb9fb11127bfd8e3eb6bf22a5ebeb9e92b0b26d',  33500),
    ('holder3',  '0x6e22a7f0568c72f5b13447d4373b2145b463ffc11b8cb1965922d3ee5f096f16',  12800),
    ('holder4',  '0x8b4c598ccaafb2e818455bfdda1cfecb35640f82ccbc0649319c01af99877b6c',   6400),
    ('holder5',  '0x8c9bce7765d881ba4f37e48d280c4fb6385eaa17b9089bcddf546783b0d4e853',   2100),
    ('holder6',  '0xaab50ac0992713ddaf251f2a3ee3cd760f565a0221c901e782a30d92d6b5ec52',    750)
) m(seed, acct, numn)
CROSS JOIN LATERAL (SELECT count(*)::int AS txs, min(height) AS first_blk, max(height) AS last_blk
                    FROM mock_evm_tx WHERE src = pg_temp.h160(m.seed)) t;

UPDATE daily_stat d SET evm_txs = d.evm_txs + c.n
FROM (SELECT date_trunc('day', ts) AS day, count(*) AS n FROM mock_evm_tx GROUP BY 1) c
WHERE d.date = c.day;

-- registrars and the judgement rollup the identities page reads. The status
-- follows the indexer rule, an erroneous verdict outranks a good one.

INSERT INTO registrar (id, index, account_id, fee, fields, added_at, request_count, given_count)
SELECT n::text, n, pg_temp.pk(who), fee, 0, :h - added, 0, 0
FROM (VALUES
    (0, 2, 0::numeric,  64000),
    (1, 4, 50e18,       62000),
    (2, 1, 0,           58000),
    (3, 7, 2.5e18,      44000),
    (4, 11, 0.5e18,     30000),
    (5, 3, 10e18,        9000)
) v(n, who, fee, added);

-- one Identity event of every kind that can surface on an account timeline. The
-- ones naming only a registrar, an authority or a username never match the
-- account filter and are left out, and so is DanglingUsernameRemoved, a variant
-- the pallet still declares but no longer emits anywhere.
CREATE FUNCTION pg_temp.utf8(t text) RETURNS text LANGUAGE sql IMMUTABLE
    AS $$ SELECT '0x' || encode(convert_to(t, 'UTF8'), 'hex') $$;

INSERT INTO event (id, block_id, index_in_block, phase, pallet, method, args)
SELECT 'mock-id-' || v.n, b.id, 90 + v.n, 'ApplyExtrinsic', 'Identity', v.method, v.args
FROM (VALUES
    ( 0, 'IdentitySet',             jsonb_build_object('who', pg_temp.pk(1)), 62000),
    ( 1, 'JudgementRequested',      jsonb_build_object('who', pg_temp.pk(1), 'registrarIndex', 0), 58000),
    ( 2, 'SubIdentityAdded',        jsonb_build_object('sub', pg_temp.pk(8), 'main', pg_temp.pk(1), 'deposit', '2000000000000000000'), 54000),
    ( 3, 'SubIdentityAdded',        jsonb_build_object('sub', pg_temp.pk(9), 'main', pg_temp.pk(1), 'deposit', '2000000000000000000'), 52000),
    ( 4, 'SubIdentityRenamed',      jsonb_build_object('sub', pg_temp.pk(9), 'main', pg_temp.pk(1)), 48000),
    ( 5, 'SubIdentitiesSet',        jsonb_build_object('main', pg_temp.pk(1), 'numberOfSubs', 2, 'newDeposit', '4000000000000000000'), 46000),
    ( 6, 'UsernameQueued',          jsonb_build_object('who', pg_temp.pk(1), 'username', pg_temp.utf8('polaris.numen'), 'expiration', 70000), 42000),
    ( 7, 'UsernameSet',             jsonb_build_object('who', pg_temp.pk(1), 'username', pg_temp.utf8('polaris.numen')), 40000),
    ( 8, 'PrimaryUsernameSet',      jsonb_build_object('who', pg_temp.pk(1), 'username', pg_temp.utf8('polaris.numen')), 38000),
    ( 9, 'JudgementUnrequested',    jsonb_build_object('who', pg_temp.pk(1), 'registrarIndex', 3), 34000),
    (10, 'SubIdentityRemoved',      jsonb_build_object('sub', pg_temp.pk(9), 'main', pg_temp.pk(1), 'deposit', '2000000000000000000'), 30000),
    (11, 'SubIdentityRevoked',      jsonb_build_object('sub', pg_temp.pk(8), 'main', pg_temp.pk(1), 'deposit', '2000000000000000000'), 26000),
    (13, 'IdentityCleared',         jsonb_build_object('who', pg_temp.pk(1), 'deposit', '5410000000000000000'), 18000),
    (14, 'IdentitySet',             jsonb_build_object('who', pg_temp.pk(1)), 16000),
    -- a force kill lands on the account whose registration was called erroneous
    (15, 'IdentityKilled',          jsonb_build_object('who', pg_temp.pk(5), 'deposit', '5410000000000000000'), 12000)
) v(n, method, args, blk)
JOIN block b ON b.height = :h - v.blk;

-- every identity event on chain rides an extrinsic, the timeline links to it
CREATE FUNCTION pg_temp.identity_call(method text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE method
        WHEN 'IdentitySet' THEN 'set_identity'
        WHEN 'IdentityCleared' THEN 'clear_identity'
        WHEN 'IdentityKilled' THEN 'kill_identity'
        WHEN 'JudgementRequested' THEN 'request_judgement'
        WHEN 'JudgementUnrequested' THEN 'cancel_request'
        WHEN 'JudgementGiven' THEN 'provide_judgement'
        WHEN 'SubIdentityAdded' THEN 'add_sub'
        WHEN 'SubIdentitiesSet' THEN 'set_subs'
        WHEN 'SubIdentityRenamed' THEN 'rename_sub'
        WHEN 'SubIdentityRemoved' THEN 'remove_sub'
        WHEN 'SubIdentityRevoked' THEN 'quit_sub'
        WHEN 'UsernameQueued' THEN 'set_username_for'
        -- the fixture queues first, so the name lands through the holder accepting it
        WHEN 'UsernameSet' THEN 'accept_username'
        WHEN 'PrimaryUsernameSet' THEN 'set_primary_username'
    END $$;

ALTER TABLE judgement ADD COLUMN IF NOT EXISTS fee numeric;

-- a JudgementGiven event behind every judgement sitting in an identity blob, so
-- the rows carry the events that would have written them on a real chain
INSERT INTO event (id, block_id, index_in_block, phase, pallet, method, args)
SELECT 'mock-jg-' || j.reg || '-' || substr(a.id, 63), b.id,
       80 + row_number() OVER (ORDER BY a.id, j.reg)::int, 'ApplyExtrinsic', 'Identity', 'JudgementGiven',
       jsonb_build_object('target', a.id, 'registrarIndex', j.reg::int)
FROM account a
CROSS JOIN LATERAL (SELECT e -> 0 ->> 0 AS reg FROM jsonb_array_elements(a.identity_json -> 'judgements') e) j
JOIN block b ON b.height = :h - (3000 + (('x' || substr(md5(a.id || j.reg), 1, 6))::bit(24)::int % 40000))
WHERE a.identity_json IS NOT NULL;

INSERT INTO judgement (id, registrar_id, target_id, kind, fee, block, timestamp)
SELECT e.id, e.args ->> 'registrarIndex', e.args ->> 'target',
       v.j -> 1 ->> '__kind', (v.j -> 1 ->> 'value')::numeric, b.height, b.timestamp
FROM event e
JOIN block b ON b.id = e.block_id
JOIN account a ON a.id = e.args ->> 'target'
CROSS JOIN LATERAL (SELECT x AS j FROM jsonb_array_elements(a.identity_json -> 'judgements') x
                    WHERE x -> 0 ->> 0 = e.args ->> 'registrarIndex') v
WHERE e.pallet = 'Identity' AND e.method = 'JudgementGiven';

CREATE TEMP TABLE mock_id_ext AS
SELECT e.id AS event_id, e.block_id,
       lpad(b.height::text, 10, '0') || '-' || substr(b.hash, 3, 5) || '-' ||
           lpad((base.n + row_number() OVER (PARTITION BY e.block_id ORDER BY e.id) - 1)::text, 6, '0') AS ext_id,
       base.n + row_number() OVER (PARTITION BY e.block_id ORDER BY e.id) - 1 AS idx,
       pg_temp.identity_call(e.method) AS call,
       coalesce(
           CASE WHEN e.method = 'JudgementGiven'
                THEN (SELECT account_id FROM registrar WHERE index = (e.args ->> 'registrarIndex')::int) END,
           e.args ->> 'who', e.args ->> 'main', e.args ->> 'sub') AS signer
FROM event e
JOIN block b ON b.id = e.block_id
CROSS JOIN LATERAL (SELECT count(*)::int AS n FROM extrinsic x WHERE x.block_id = e.block_id) base
WHERE e.id LIKE 'mock-%';

INSERT INTO extrinsic (id, block_id, index_in_block, hash, pallet, method, success, signer_id, fee, tip)
SELECT ext_id, block_id, idx, '0x' || md5(ext_id) || md5(ext_id || '~'), 'Identity', call, true, signer,
       9000000000000 + (('x' || substr(md5(ext_id), 1, 6))::bit(24)::int)::numeric * 200000, 0
FROM mock_id_ext;

UPDATE event e SET extrinsic_id = m.ext_id FROM mock_id_ext m WHERE e.id = m.event_id;

-- the root call, carrying the args the timeline unpacks. the events carry none
-- of this and the extrinsic row no longer holds a copy
INSERT INTO call (id, extrinsic_id, block_id, address, pallet, method, args, success, origin_id)
SELECT m.ext_id || '-0', m.ext_id, m.block_id, '{}'::int[], 'Identity', m.call, CASE m.call
    WHEN 'set_identity' THEN jsonb_build_object('info', (SELECT identity_json -> 'info' FROM account WHERE id = m.signer))
    WHEN 'add_sub' THEN jsonb_build_object(
        'sub', jsonb_build_object('__kind', 'Id', 'value', e.args ->> 'sub'),
        'data', pg_temp.raw(coalesce((SELECT identity_sub_name FROM account WHERE id = e.args ->> 'sub'), 'sub')))
    WHEN 'rename_sub' THEN jsonb_build_object(
        'sub', jsonb_build_object('__kind', 'Id', 'value', e.args ->> 'sub'),
        'data', pg_temp.raw('ops'))
    WHEN 'set_subs' THEN jsonb_build_object('subs', jsonb_build_array(
        jsonb_build_array(pg_temp.pk(8), pg_temp.raw('payouts')),
        jsonb_build_array(pg_temp.pk(9), pg_temp.raw('ops'))))
END, true, m.signer
FROM mock_id_ext m
JOIN event e ON e.id = m.event_id;

UPDATE event e SET call_id = m.ext_id || '-0' FROM mock_id_ext m WHERE e.id = m.event_id;

UPDATE registrar r SET given_count = c.n, request_count = c.n + c.extra,
    last_judgement_block = c.last_block, last_judgement_at = c.last_at
FROM (SELECT registrar_id, count(*)::int AS n, (count(*) / 2 + 1)::int AS extra,
             max(block) AS last_block, max(timestamp) AS last_at
      FROM judgement GROUP BY registrar_id) c
WHERE r.id = c.registrar_id;

UPDATE account a SET identity_status = CASE WHEN k.bad THEN 'FLAGGED' WHEN k.good THEN 'VERIFIED' ELSE 'UNVERIFIED' END
FROM (
    SELECT a2.id,
           bool_or(j -> 1 ->> '__kind' IN ('Erroneous', 'LowQuality')) AS bad,
           bool_or(j -> 1 ->> '__kind' IN ('KnownGood', 'Reasonable')) AS good
    FROM account a2
    LEFT JOIN LATERAL jsonb_array_elements(coalesce(a2.identity_json -> 'judgements', '[]'::jsonb)) j ON true
    WHERE a2.identity_json IS NOT NULL
    GROUP BY a2.id
) k
WHERE a.id = k.id;

-- the fixture adds extrinsics, so their call kinds have to exist in the lookup
INSERT INTO call_kind (id, pallet, method)
SELECT DISTINCT pallet || '.' || method, pallet, method FROM extrinsic
ON CONFLICT (id) DO NOTHING;

-- the fixture adds accounts and referenda, so the day totals have to be redone
-- from the rows that now exist
WITH per_day AS (
    SELECT to_char(b.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*) AS n
    FROM account t JOIN block b ON b.height = t.first_seen_block
    GROUP BY 1
), running AS (
    SELECT d.id, sum(coalesce(p.n, 0)) OVER (ORDER BY d.id) AS total
    FROM daily_stat d LEFT JOIN per_day p ON p.day = d.id
)
UPDATE daily_stat d SET accounts_total = r.total FROM running r WHERE r.id = d.id;

WITH per_day AS (
    SELECT to_char(b.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*) AS n
    FROM referendum t JOIN block b ON b.height = t.submitted_at
    GROUP BY 1
), running AS (
    SELECT d.id, sum(coalesce(p.n, 0)) OVER (ORDER BY d.id) AS total
    FROM daily_stat d LEFT JOIN per_day p ON p.day = d.id
)
UPDATE daily_stat d SET referenda_total = r.total FROM running r WHERE r.id = d.id;
