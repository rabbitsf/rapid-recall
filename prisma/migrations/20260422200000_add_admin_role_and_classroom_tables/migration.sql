-- AlterEnum: add admin role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'admin';

-- CreateTable: google_tokens
CREATE TABLE IF NOT EXISTS "google_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "google_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "google_tokens_user_id_key" ON "google_tokens"("user_id");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'google_tokens_user_id_fkey') THEN
        ALTER TABLE "google_tokens" ADD CONSTRAINT "google_tokens_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: classroom_syncs
CREATE TABLE IF NOT EXISTS "classroom_syncs" (
    "id" TEXT NOT NULL,
    "google_course_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "classroom_syncs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "classroom_syncs_google_course_id_teacher_id_key"
    ON "classroom_syncs"("google_course_id", "teacher_id");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classroom_syncs_class_id_fkey') THEN
        ALTER TABLE "classroom_syncs" ADD CONSTRAINT "classroom_syncs_class_id_fkey"
            FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: classroom_student_mappings
CREATE TABLE IF NOT EXISTS "classroom_student_mappings" (
    "id" TEXT NOT NULL,
    "google_user_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "classroom_student_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "classroom_student_mappings_google_user_id_key"
    ON "classroom_student_mappings"("google_user_id");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classroom_student_mappings_user_id_fkey') THEN
        ALTER TABLE "classroom_student_mappings" ADD CONSTRAINT "classroom_student_mappings_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
