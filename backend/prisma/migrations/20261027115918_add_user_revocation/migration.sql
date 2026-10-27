-- AlterTable
ALTER TABLE `User` ADD COLUMN `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `revokedAt` DATETIME(3) NULL,
    ADD COLUMN `revokedReason` VARCHAR(500) NULL;

-- CreateIndex
CREATE INDEX `User_isRevoked_idx` ON `User`(`isRevoked`);
