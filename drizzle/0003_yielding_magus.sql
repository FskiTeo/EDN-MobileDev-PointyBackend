CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'excused');--> statement-breakpoint
ALTER TABLE "course_student" ADD COLUMN "attendance" "attendance_status" DEFAULT 'absent';