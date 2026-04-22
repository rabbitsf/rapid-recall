-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "google_id" DROP NOT NULL;
