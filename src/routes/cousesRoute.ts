import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { courses, courseStudents, students } from "../db/schema";
import { requireAuth } from "../middlewares/authMiddleware";

const coursesRouter = Router();

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   teacher:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /courses/mycourses:
 *   get:
 *     summary: Get courses taught by current teacher
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   teacher:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *                   studentCount:
 *                     type: integer
 *                     description: Number of students enrolled in the course
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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
						student: true
					},
				},
			},
		});

		const coursesWithCount = data.map(course => {
			const { courseStudents, ...rest } = course;
			return { ...rest, studentCount: courseStudents.length };
		});

		res.json(coursesWithCount);
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch my courses", error });
	}
});

/**
 * @swagger
 * /courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 teacher:
 *                   type: object
 *                 courseStudents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       student:
 *                         type: object
 *       400:
 *         description: Invalid course ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /courses/attendance:
 *   patch:
 *     summary: Update student attendance for a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseId:
 *                 type: string
 *               studentId:
 *                 type: string
 *                 description: Student ID (optional if using cardSerial)
 *               cardSerial:
 *                 type: string
 *                 description: Student card serial (optional if using studentId)
 *               attendance:
 *                 type: string
 *                 enum: [present, absent, excused]
 *             required:
 *               - courseId
 *               - attendance
 *     responses:
 *       200:
 *         description: Check-in successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 studentId:
 *                   type: string
 *                 courseId:
 *                   type: string
 *                 attendance:
 *                   type: string
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course or student not found
 *       500:
 *         description: Internal server error
 */
coursesRouter.patch("/attendance", requireAuth, async (req, res) => {
    try {
        let { courseId = null, studentId = null, cardSerial = null, attendance = null } = req.body || {};

		if (!courseId || typeof courseId !== "string") {
			return res.status(400).json({ message: "Bad request." });
		}
		if ((!studentId || typeof studentId !== "string") && (!cardSerial || typeof cardSerial !== "string")) {
			return res.status(400).json({ message: "Bad request." });
		}
        if (!["present", "absent", "excused"].includes(attendance)) {
            return res.status(400).json({ message: "Invalid attendance value" });
        }

		if (cardSerial && !studentId) {
			const student = await db.query.students.findFirst({
				where: eq(students.cardSerial, cardSerial),
			});
			if (!student) {
				return res.status(404).json({ message: "Student not found" });
			}
			studentId = student.id;
		}

        const existing = await db.query.courseStudents.findFirst({
            where: and(
				eq(courseStudents.courseId, courseId),
				eq(courseStudents.studentId, studentId)
			)
        });

        if (!existing) {
            return res.status(404).json({ message: "Course or student not found" });
        }

        await db.update(courseStudents)
            .set({ attendance: attendance as "present" | "absent" | "excused" })
            .where(and(eq(courseStudents.courseId, courseId), eq(courseStudents.studentId, studentId)));

        return res.status(200).json({ message: "Check-in successful", studentId, courseId, attendance });
    } catch (error) {
        return res.status(500).json({ message: "Failed to check in", error });
    }
});

export default coursesRouter;
