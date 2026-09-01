module.exports = class Data1788223125080 {
    name = 'Data1788223125080'

    async up(db) {
        await db.query(`CREATE TABLE "metadata_action" ("id" character varying NOT NULL, "kind" text NOT NULL, "hash" text NOT NULL, "title" text, "description" text, "block" integer NOT NULL, "referendum_id" character varying, CONSTRAINT "PK_a8a90b1f7a4176e57dbc75b0fbc" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "idx_metadata_action_referendum_cebd26a9" ON "metadata_action" ("referendum_id") `)
        await db.query(`ALTER TABLE "metadata_action" ADD CONSTRAINT "FK_a5249599e1835bcb6f6d5460209" FOREIGN KEY ("referendum_id") REFERENCES "referendum"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "metadata_action" DROP CONSTRAINT "FK_a5249599e1835bcb6f6d5460209"`)
        await db.query(`DROP INDEX "public"."idx_metadata_action_referendum_cebd26a9"`)
        await db.query(`DROP TABLE "metadata_action"`)
    }
}
