-- CreateEnum
CREATE TYPE "AppCategory" AS ENUM ('CLOUD_STORAGE', 'FILE_TRANSFER', 'SOCIAL_MEDIA', 'SAAS', 'OTHER');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "category" "AppCategory" NOT NULL DEFAULT 'OTHER';
