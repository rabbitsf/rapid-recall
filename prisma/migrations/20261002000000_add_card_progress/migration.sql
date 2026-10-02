-- CreateTable
CREATE TABLE "card_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "term_key" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "last_studied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_progress_set_id_idx" ON "card_progress"("set_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_progress_user_id_set_id_term_key_key" ON "card_progress"("user_id", "set_id", "term_key");

-- AddForeignKey
ALTER TABLE "card_progress" ADD CONSTRAINT "card_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_progress" ADD CONSTRAINT "card_progress_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "word_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
