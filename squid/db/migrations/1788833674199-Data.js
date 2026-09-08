module.exports = class Data1788833674199 {
    name = 'Data1788833674199'

    async up(db) {
        await db.query(`ALTER TABLE "account" ADD "first_seen_timestamp" TIMESTAMP WITH TIME ZONE`)
        await db.query(`UPDATE "account" a SET "first_seen_timestamp" = b."timestamp" FROM "block" b WHERE b."height" = a."first_seen_block"`)
        await db.query(`ALTER TABLE "account" ALTER COLUMN "first_seen_timestamp" SET NOT NULL`)
        await db.query(`ALTER TABLE "referendum" ADD "submitted_timestamp" TIMESTAMP WITH TIME ZONE`)
        await db.query(`UPDATE "referendum" r SET "submitted_timestamp" = b."timestamp" FROM "block" b WHERE b."height" = r."submitted_at"`)
        await db.query(`ALTER TABLE "referendum" ALTER COLUMN "submitted_timestamp" SET NOT NULL`)
        for (const table of ['vote_action', 'metadata_action', 'delegation_action']) {
            await db.query(`ALTER TABLE "${table}" ADD "timestamp" TIMESTAMP WITH TIME ZONE`)
            await db.query(`UPDATE "${table}" t SET "timestamp" = b."timestamp" FROM "block" b WHERE b."height" = t."block"`)
            await db.query(`ALTER TABLE "${table}" ALTER COLUMN "timestamp" SET NOT NULL`)
        }
        for (const table of ['referendum', 'bounty']) {
            await db.query(`UPDATE "${table}" r SET "timeline" = s."steps" FROM (
                SELECT r2."id", jsonb_agg(t."step" || jsonb_build_object('timestamp', to_char(b."timestamp" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) ORDER BY t."ord") AS "steps"
                FROM "${table}" r2, jsonb_array_elements(r2."timeline") WITH ORDINALITY AS t("step", "ord")
                JOIN "block" b ON b."height" = (t."step" ->> 'block')::int
                GROUP BY r2."id"
            ) s WHERE s."id" = r."id"`)
        }
        await db.query(`CREATE INDEX "idx_account_first_seen_timestamp_00087e2f" ON "account" ("first_seen_timestamp") `)
        await db.query(`CREATE INDEX "idx_referendum_submitted_timestamp_f1c3e7bf" ON "referendum" ("submitted_timestamp") `)
    }

    async down(db) {
        await db.query(`DROP INDEX "public"."idx_referendum_submitted_timestamp_f1c3e7bf"`)
        await db.query(`DROP INDEX "public"."idx_account_first_seen_timestamp_00087e2f"`)
        for (const table of ['referendum', 'bounty']) {
            await db.query(`UPDATE "${table}" r SET "timeline" = s."steps" FROM (
                SELECT r2."id", jsonb_agg(t."step" - 'timestamp' ORDER BY t."ord") AS "steps"
                FROM "${table}" r2, jsonb_array_elements(r2."timeline") WITH ORDINALITY AS t("step", "ord")
                GROUP BY r2."id"
            ) s WHERE s."id" = r."id"`)
        }
        await db.query(`ALTER TABLE "delegation_action" DROP COLUMN "timestamp"`)
        await db.query(`ALTER TABLE "metadata_action" DROP COLUMN "timestamp"`)
        await db.query(`ALTER TABLE "vote_action" DROP COLUMN "timestamp"`)
        await db.query(`ALTER TABLE "referendum" DROP COLUMN "submitted_timestamp"`)
        await db.query(`ALTER TABLE "account" DROP COLUMN "first_seen_timestamp"`)
    }
}
