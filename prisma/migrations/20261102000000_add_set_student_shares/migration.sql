-- CreateTable
CREATE TABLE "set_student_shares" (
    "set_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,

    CONSTRAINT "set_student_shares_pkey" PRIMARY KEY ("set_id","class_id","student_id")
);

-- CreateIndex
CREATE INDEX "set_student_shares_student_id_idx" ON "set_student_shares"("student_id");

-- AddForeignKey
ALTER TABLE "set_student_shares" ADD CONSTRAINT "set_student_shares_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "word_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_student_shares" ADD CONSTRAINT "set_student_shares_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_student_shares" ADD CONSTRAINT "set_student_shares_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
