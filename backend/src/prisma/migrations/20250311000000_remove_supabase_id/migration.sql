-- DropIndex
DROP INDEX IF EXISTS "User_supabaseId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "supabaseId";
