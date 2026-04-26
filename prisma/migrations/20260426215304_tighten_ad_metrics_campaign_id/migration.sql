/*
  Warnings:

  - Made the column `campaignId` on table `ListingAdMetric` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ListingAdMetric" ALTER COLUMN "campaignId" SET NOT NULL,
ALTER COLUMN "campaignId" SET DEFAULT '';
