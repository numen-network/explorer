module.exports = class Data1788834451951 {
    name = 'Data1788834451951'

    async up(db) {
        for (const [table, amount] of [['vote', 'amount'], ['vote_action', 'amount'], ['delegation', 'balance']]) {
            await db.query(`ALTER TABLE "${table}" ADD "votes" numeric NOT NULL DEFAULT 0`)
            await db.query(`UPDATE "${table}" SET "votes" = CASE WHEN "conviction" IS NULL THEN "${amount}" WHEN "conviction" = '0x' THEN floor("${amount}" / 10) ELSE "${amount}" * left("conviction", -1)::numeric END`)
            await db.query(`ALTER TABLE "${table}" ALTER COLUMN "votes" DROP DEFAULT`)
        }
    }

    async down(db) {
        await db.query(`ALTER TABLE "delegation" DROP COLUMN "votes"`)
        await db.query(`ALTER TABLE "vote_action" DROP COLUMN "votes"`)
        await db.query(`ALTER TABLE "vote" DROP COLUMN "votes"`)
    }
}
