-- CreateTable
CREATE TABLE `CompanyCalendarDay` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `type` ENUM('HOLIDAY', 'WORKING_DAY') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyCalendarDay_date_key`(`date`),
    INDEX `CompanyCalendarDay_type_date_idx`(`type`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
