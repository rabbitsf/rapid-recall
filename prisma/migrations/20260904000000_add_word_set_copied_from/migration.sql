-- AlterTable
ALTER TABLE "word_sets" ADD COLUMN     "copied_from_set_id" TEXT;

-- AddForeignKey
ALTER TABLE "word_sets" ADD CONSTRAINT "word_sets_copied_from_set_id_fkey" FOREIGN KEY ("copied_from_set_id") REFERENCES "word_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
