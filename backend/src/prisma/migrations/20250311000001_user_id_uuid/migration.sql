-- AlterTable: Change User.id from SERIAL (integer) to UUID (text)
-- Existing rows get a new UUID; Convex data keyed by old integer userId will no longer match (consider re-associating or clearing old Convex data per user).

ALTER TABLE "User" ADD COLUMN "id_new" TEXT;

UPDATE "User" SET "id_new" = gen_random_uuid()::text;

ALTER TABLE "User" ALTER COLUMN "id_new" SET NOT NULL;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_pkey";

ALTER TABLE "User" DROP COLUMN "id";

ALTER TABLE "User" RENAME COLUMN "id_new" TO "id";

ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
