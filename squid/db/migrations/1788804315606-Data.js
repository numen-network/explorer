module.exports = class Data1788804315606 {
    name = 'Data1788804315606'

    async up(db) {
        await db.query(`ALTER TABLE "chain_info" ADD "submission_deposit" numeric NOT NULL DEFAULT 0`)
        await db.query(`ALTER TABLE "chain_info" ALTER COLUMN "submission_deposit" DROP DEFAULT`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "chain_info" DROP COLUMN "submission_deposit"`)
    }
}
