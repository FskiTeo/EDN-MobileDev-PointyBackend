import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { courses, courseStudents } from "../db/schema";

const coursesRouter = Router();

coursesRouter.get("/", async (_req, res) => {
	try {
		const data = await db.query.courses.findMany({
			with: {
				teacher: {
                    columns: { id: true, firstName: true, lastName: true, email: true },
                },
			},
		});

		res.json(data);
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch courses", error });
	}
});

coursesRouter.get("/mycourses", async (_req, res) => {
	try {
		const teacherId = res.locals['auth'].teacherId;

		const data = await db.query.courses.findMany({
			where: eq(courses.teacherId, teacherId),
			with: {
				teacher: {
					columns: { id: true, firstName: true, lastName: true, email: true },
				},
				courseStudents: {
					with: {
						student: true,
					},
				},
			},
		});

		res.json(data);
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch my courses", error });
	}
});

coursesRouter.get("/:id", async (req, res) => {
	try {
		const data = await db.query.courses.findFirst({
			where: eq(courses.id, req.params.id),
			with: {
				teacher: true,
				courseStudents: {
					with: {
						student: true,
					},
				},
			},
		});

		if (!data) {
			return res.status(404).json({ message: "Course not found" });
		}

		return res.json(data);
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch course", error });
	}
});

coursesRouter.patch("/presence/:courseId/:studentId/:attendance", async (req, res) => {
    try {
        const { courseId, studentId, attendance } = req.params;

            if (!["present", "absent", "excused"].includes(attendance)) {
                return res.status(400).json({ message: "Invalid attendance value" });
            }

        const existing = await db.query.courseStudents.findFirst({
            where: eq(courseStudents.courseId, courseId) && eq(courseStudents.studentId, studentId),
        });

        if (!existing) {
            return res.status(404).json({ message: "Course or student not found" });
        }

        await db.update(courseStudents)
            .set({ attendance: attendance as "present" | "absent" | "excused" })
            .where(eq(courseStudents.courseId, courseId) && eq(courseStudents.studentId, studentId));

        return res.json({ message: "Check-in successful", studentId, courseId, attendance });
    } catch (error) {
        return res.status(500).json({ message: "Failed to check in", error });
    }
});

export default coursesRouter;
