-- AlterTable
ALTER TABLE `Attendance` MODIFY `status` ENUM('present', 'absent', 'late', 'leave', 'holiday') NOT NULL;
