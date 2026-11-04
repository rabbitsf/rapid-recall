-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'super_admin' BEFORE 'admin';

-- AlterTable
ALTER TABLE "word_sets" ADD COLUMN "shared_with_grade" BOOLEAN NOT NULL DEFAULT false;
