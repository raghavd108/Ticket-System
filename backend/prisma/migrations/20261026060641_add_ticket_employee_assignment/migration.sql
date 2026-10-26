-- AlterTable
ALTER TABLE `Complaint` ADD COLUMN `assignedEmployeeId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Complaint_assignedEmployeeId_idx` ON `Complaint`(`assignedEmployeeId`);

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_assignedEmployeeId_fkey` FOREIGN KEY (`assignedEmployeeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
