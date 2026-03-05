import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { teachers } from "../db/schema";
import { type AuthTokenPayload, requireAuth, jwtSecret } from "../middlewares/authMiddleware";
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";

const teachersRouter = Router();

/**
 * @swagger
 * /teachers/me:
 *   get:
 *     summary: Get current teacher profile
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 lastLogin:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Teacher not found
 *       500:
 *         description: Internal server error
 */
teachersRouter.get("/me", requireAuth, async (_req, res) => {
    try {
        const payload = res.locals["auth"] as AuthTokenPayload;
        const teacher = await db.query.teachers.findFirst({
            where: eq(teachers.id, payload.teacherId),
            columns: { id: true, firstName: true, lastName: true, email: true, lastLogin: true },
        });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        return res.json(teacher);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch profile", error });
    }
});

/**
 * @swagger
 * /teachers/{id}:
 *   get:
 *     summary: Get teacher by ID
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 email:
 *                   type: string
 *       400:
 *         description: Invalid teacher ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Teacher not found
 *       500:
 *         description: Internal server error
 */
teachersRouter.get("/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Teacher ID is required" });
        }

        const teacher = await db.query.teachers.findFirst({
            where: eq(teachers.id, id),
            columns: { id: true, firstName: true, lastName: true, email: true },
        });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        return res.json(teacher);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch teacher", error });
    }
});

/**
 * @swagger
 * /teachers/login:
 *   post:
 *     summary: Login teacher
 *     tags: [Teachers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 teacher:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Email and password are required
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: Teacher not found
 *       500:
 *         description: Internal server error
 */
teachersRouter.post('/login', async (req, res) => {
    try {
        const { email = null, password = null } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const teacher = await db.query.teachers.findFirst({
            where: eq(teachers.email, email),
        });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        let isPasswordValid = false;
        try {
            isPasswordValid = await compare(password, teacher.password);
        } catch (_error) {
            isPasswordValid = false;
        }

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        await db
            .update(teachers)
            .set({ lastLogin: new Date(), updatedAt: new Date() })
            .where(eq(teachers.id, teacher.id));

        const token = jwt.sign(
            { teacherId: teacher.id, email: teacher.email } satisfies AuthTokenPayload,
            jwtSecret,
            { expiresIn: "1h" }
        );

        return res.json({
            message: "Login successful",
            token,
            teacher: {
                id: teacher.id,
                firstName: teacher.firstName,
                lastName: teacher.lastName,
                email: teacher.email,
            },
        });

    } catch (error) {
        return res.status(500).json({ message: "Login failed", error });
    }
});

export default teachersRouter;