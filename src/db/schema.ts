import { relations } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const attendanceEnum = pgEnum("attendance_status", ["present", "absent", "excused"]);

export const teachers = pgTable("teacher", {
	id: uuid("id").defaultRandom().primaryKey(),
	email: text("email").notNull().unique(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	password: text("password").notNull(),
	lastLogin: timestamp("last_login", { withTimezone: true }),
	cardSerial: text("card_serial").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const students = pgTable("student", {
	id: uuid("id").defaultRandom().primaryKey(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	cardSerial: text("card_serial").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const courses = pgTable("course", {
	id: uuid("id").defaultRandom().primaryKey(),
	teacherId: uuid("teacher_id")
		.notNull()
		.references(() => teachers.id, { onDelete: "restrict", onUpdate: "cascade" }),
    name: text("name").notNull(),
	startDateTime: timestamp("start_date_time", { withTimezone: true }).notNull(),
	duration: integer("duration").notNull(),
    location: text("location").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const courseStudents = pgTable(
	"course_student",
	{
		courseId: uuid("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade", onUpdate: "cascade" }),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade", onUpdate: "cascade" }),
		attendance: attendanceEnum("attendance").default("absent"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.courseId, table.studentId] }),
	})
);

export const teachersRelations = relations(teachers, ({ many }) => ({
	courses: many(courses),
}));

export const studentsRelations = relations(students, ({ many }) => ({
	courseStudents: many(courseStudents),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
	teacher: one(teachers, {
		fields: [courses.teacherId],
		references: [teachers.id],
	}),
	courseStudents: many(courseStudents),
}));

export const courseStudentsRelations = relations(courseStudents, ({ one }) => ({
	course: one(courses, {
		fields: [courseStudents.courseId],
		references: [courses.id],
	}),
	student: one(students, {
		fields: [courseStudents.studentId],
		references: [students.id],
	}),
}));
