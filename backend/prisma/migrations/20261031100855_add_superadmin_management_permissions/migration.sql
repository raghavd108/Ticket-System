-- AlterTable
ALTER TABLE `Designation` ADD COLUMN `canManageUsers` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `managementLevel` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `isSuperAdmin` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `User_isSuperAdmin_idx` ON `User`(`isSuperAdmin`);
