module.exports = class Data1788612718601 {
    name = 'Data1788612718601'

    async up(db) {
        await db.query(`ALTER TABLE "chain_info" ADD "vote_locking_period" integer NOT NULL DEFAULT 0`)
        await db.query(`ALTER TABLE "chain_info" ALTER COLUMN "vote_locking_period" DROP DEFAULT`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "chain_info" DROP COLUMN "vote_locking_period"`)
    }
}
