-- CreateTable
CREATE TABLE `ClientFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `organisationId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClientFeedback_clientId_createdAt_idx`(`clientId`, `createdAt`),
    INDEX `ClientFeedback_organisationId_createdAt_idx`(`organisationId`, `createdAt`),
    INDEX `ClientFeedback_rating_idx`(`rating`),
    INDEX `ClientFeedback_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClientFeedback` ADD CONSTRAINT `ClientFeedback_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientFeedback` ADD CONSTRAINT `ClientFeedback_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
