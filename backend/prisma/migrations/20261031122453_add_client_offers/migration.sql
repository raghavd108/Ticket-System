/*
  Warnings:

  - A unique constraint covering the columns `[offerId,userId]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Designation` ADD COLUMN `canPublishOffers` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `offerId` VARCHAR(191) NULL,
    MODIFY `type` ENUM('NEW_TICKET', 'STATUS_UPDATE', 'CUSTOM', 'OFFER') NOT NULL;

-- CreateTable
CREATE TABLE `Offer` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `audience` ENUM('ALL_CLIENTS', 'ORGANISATION_CATEGORIES', 'SELECTED_ORGANISATIONS') NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Offer_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `Offer_expiresAt_idx`(`expiresAt`),
    INDEX `Offer_createdBy_idx`(`createdBy`),
    INDEX `Offer_audience_idx`(`audience`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OfferImage` (
    `id` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,

    INDEX `OfferImage_offerId_idx`(`offerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OfferCategory` (
    `id` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,

    INDEX `OfferCategory_category_idx`(`category`),
    UNIQUE INDEX `OfferCategory_offerId_category_key`(`offerId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OfferOrganisation` (
    `id` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `organisationId` VARCHAR(191) NOT NULL,

    INDEX `OfferOrganisation_organisationId_idx`(`organisationId`),
    UNIQUE INDEX `OfferOrganisation_offerId_organisationId_key`(`offerId`, `organisationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Notification_offerId_idx` ON `Notification`(`offerId`);

-- CreateIndex
CREATE UNIQUE INDEX `Notification_offerId_userId_key` ON `Notification`(`offerId`, `userId`);

-- CreateIndex
CREATE INDEX `Organisation_orgType_idx` ON `Organisation`(`orgType`);

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferImage` ADD CONSTRAINT `OfferImage_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferCategory` ADD CONSTRAINT `OfferCategory_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferOrganisation` ADD CONSTRAINT `OfferOrganisation_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferOrganisation` ADD CONSTRAINT `OfferOrganisation_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
