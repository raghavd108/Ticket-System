/*
  Warnings:

  - The values [ANNOUNCEMENT,LEAVE_REQUEST,LEAVE_APPROVED,LEAVE_REJECTED] on the enum `Notification_type` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Announcement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AnnouncementRecipient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DeviceToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Announcement` DROP FOREIGN KEY `Announcement_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `AnnouncementRecipient` DROP FOREIGN KEY `AnnouncementRecipient_announcementId_fkey`;

-- DropForeignKey
ALTER TABLE `AnnouncementRecipient` DROP FOREIGN KEY `AnnouncementRecipient_userId_fkey`;

-- DropForeignKey
ALTER TABLE `DeviceToken` DROP FOREIGN KEY `DeviceToken_userId_fkey`;

-- AlterTable
ALTER TABLE `Notification` MODIFY `type` ENUM('NEW_TICKET', 'STATUS_UPDATE', 'CUSTOM') NOT NULL;

-- DropTable
DROP TABLE `Announcement`;

-- DropTable
DROP TABLE `AnnouncementRecipient`;

-- DropTable
DROP TABLE `DeviceToken`;
