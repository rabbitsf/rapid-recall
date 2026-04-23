-- AlterTable
ALTER TABLE "word_sets" ADD COLUMN "is_spanish" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "cards" ADD COLUMN "uploaded_image_url" TEXT;
