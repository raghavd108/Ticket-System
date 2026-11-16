-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `leaveId` VARCHAR(191) NULL,
    MODIFY `type` ENUM('NEW_TICKET', 'STATUS_UPDATE', 'CUSTOM', 'OFFER', 'LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED') NOT NULL;

-- CreateIndex
CREATE INDEX `Notification_leaveId_idx` ON `Notification`(`leaveId`);

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_leaveId_fkey` FOREIGN KEY (`leaveId`) REFERENCES `Leave`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
