import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { courses, courseStudents } from "../db/schema";
import { requireAuth } from "../middlewares/authMiddleware";

const coursesRouter = Router();

coursesRouter.get("/", requireAuth, async (_req, res) => {
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

coursesRouter.get("/mycourses", requireAuth, async (_req, res) => {
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

coursesRouter.get("/:id", requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
		
		if (!id || typeof id !== "string") {
			return res.status(400).json({ message: "Course ID is required" });
		}

		const data = await db.query.courses.findFirst({
			where: eq(courses.id, id),
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

coursesRouter.patch("/presence/:courseId/:studentId/:attendance", requireAuth, async (req, res) => {
    try {
        const { courseId, studentId, attendance } = req.params;

		if (!courseId || !studentId || !attendance || typeof courseId !== "string" || typeof studentId !== "string" || typeof attendance !== "string") {
			return res.status(400).json({ message: "Course ID, student ID, and attendance are required" });
		}

        if (!["present", "absent", "excused"].includes(attendance)) {
            return res.status(400).json({ message: "Invalid attendance value" });
        }

        const existing = await db.query.courseStudents.findFirst({
            where: and(eq(courseStudents.courseId, courseId), eq(courseStudents.studentId, studentId)),
        });

        if (!existing) {
            return res.status(404).json({ message: "Course or student not found" });
        }

        await db.update(courseStudents)
            .set({ attendance: attendance as "present" | "absent" | "excused" })
            .where(and(eq(courseStudents.courseId, courseId), eq(courseStudents.studentId, studentId)));

        return res.json({ message: "Check-in successful", studentId, courseId, attendance });
    } catch (error) {
        return res.status(500).json({ message: "Failed to check in", error });
    }
});

export default coursesRouter;
