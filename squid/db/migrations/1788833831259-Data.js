module.exports = class Data1788833831259 {
    name = 'Data1788833831259'

    async up(db) {
        await db.query(`ALTER TABLE "daily_stat" ADD "miners_active" integer NOT NULL DEFAULT 0`)
        await db.query(`ALTER TABLE "daily_stat" ADD "rewards" numeric NOT NULL DEFAULT 0`)
        await db.query(`UPDATE "daily_stat" d SET "miners_active" = m."miners", "rewards" = m."rewards" FROM (SELECT "day", count(*) AS "miners", sum("rewards") AS "rewards" FROM "miner_day_stat" GROUP BY "day") m WHERE m."day" = d."id"`)
        await db.query(`ALTER TABLE "daily_stat" ALTER COLUMN "miners_active" DROP DEFAULT`)
        await db.query(`ALTER TABLE "daily_stat" ALTER COLUMN "rewards" DROP DEFAULT`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "daily_stat" DROP COLUMN "rewards"`)
        await db.query(`ALTER TABLE "daily_stat" DROP COLUMN "miners_active"`)
    }
}
