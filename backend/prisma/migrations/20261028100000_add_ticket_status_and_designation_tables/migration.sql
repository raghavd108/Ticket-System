-- Ticket statuses and employee designations move from hard-coded values
-- into lookup tables. Existing data is backfilled before the legacy
-- Complaint.status enum column is removed, so no ticket loses its status.

-- CreateTable
CREATE TABLE `TicketStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isFinal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TicketStatus_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Designation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `canViewAllTickets` BOOLEAN NOT NULL DEFAULT false,
    `canAssignTickets` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Designation_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default ticket statuses (prisma/seed.js keeps these up to date).
INSERT INTO `TicketStatus` (`code`, `name`, `sortOrder`, `isFinal`, `updatedAt`) VALUES
    ('pending', 'Pending', 1, false, CURRENT_TIMESTAMP(3)),
    ('assigned', 'Assigned', 2, false, CURRENT_TIMESTAMP(3)),
    ('in-progress', 'In Progress', 3, false, CURRENT_TIMESTAMP(3)),
    ('work-completed', 'Work Completed', 4, false, CURRENT_TIMESTAMP(3)),
    ('release-updated', 'Release Updated', 5, true, CURRENT_TIMESTAMP(3)),
    ('cancelled', 'Cancelled', 6, true, CURRENT_TIMESTAMP(3));

-- Seed default designations. Management designations can view all
-- tickets and assign them; developers only see tickets assigned to them.
INSERT INTO `Designation` (`name`, `canViewAllTickets`, `canAssignTickets`, `updatedAt`) VALUES
    ('Administrator', true, true, CURRENT_TIMESTAMP(3)),
    ('CEO', true, true, CURRENT_TIMESTAMP(3)),
    ('CTO', true, true, CURRENT_TIMESTAMP(3)),
    ('Customer Care', true, true, CURRENT_TIMESTAMP(3)),
    ('Business Development Manager', true, true, CURRENT_TIMESTAMP(3)),
    ('Sales Executive', true, true, CURRENT_TIMESTAMP(3)),
    ('Developer', false, false, CURRENT_TIMESTAMP(3));

-- Preserve every designation already in use (no ticket permissions by
-- default; an admin can grant them). Matching is case-insensitive.
INSERT IGNORE INTO `Designation` (`name`, `updatedAt`)
    SELECT DISTINCT TRIM(`designation`), CURRENT_TIMESTAMP(3)
    FROM `User`
    WHERE `designation` IS NOT NULL AND TRIM(`designation`) <> '';

-- Normalise existing user designations to the stored spelling.
UPDATE `User` u
    JOIN `Designation` d ON d.`name` = TRIM(u.`designation`)
    SET u.`designation` = d.`name`;

UPDATE `User` SET `designation` = NULL
    WHERE `designation` IS NOT NULL AND TRIM(`designation`) = '';

-- Backfill Complaint.statusId from the legacy enum column.
-- resolved maps to "Work Completed".
ALTER TABLE `Complaint` ADD COLUMN `statusId` INTEGER NULL;

UPDATE `Complaint` c
    JOIN `TicketStatus` s ON s.`code` = CASE c.`status`
        WHEN 'in-progress' THEN 'in-progress'
        WHEN 'resolved' THEN 'work-completed'
        ELSE 'pending'
    END
    SET c.`statusId` = s.`id`;

ALTER TABLE `Complaint` MODIFY `statusId` INTEGER NOT NULL;

-- The organisation FK relies on the old composite index; replace it.
ALTER TABLE `Complaint` DROP FOREIGN KEY `Complaint_organisationId_fkey`;
DROP INDEX `Complaint_organisationId_status_idx` ON `Complaint`;
ALTER TABLE `Complaint` DROP COLUMN `status`;

CREATE INDEX `Complaint_organisationId_statusId_idx` ON `Complaint`(`organisationId`, `statusId`);
CREATE INDEX `Complaint_statusId_createdAt_idx` ON `Complaint`(`statusId`, `createdAt`);

ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `Organisation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `TicketStatus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Designation integrity
CREATE INDEX `User_designation_idx` ON `User`(`designation`);
ALTER TABLE `User` ADD CONSTRAINT `User_designation_fkey` FOREIGN KEY (`designation`) REFERENCES `Designation`(`name`) ON DELETE RESTRICT ON UPDATE CASCADE;
