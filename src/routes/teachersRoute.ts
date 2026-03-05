import { Router } from "express";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { teachers } from "../db/schema";
import { type AuthTokenPayload, jwtSecret, requireAuth } from "../middlewares/authMiddleware";

const teachersRouter = Router();

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

teachersRouter.get("/:id", async (req, res) => {
    try {
        const teacher = await db.query.teachers.findFirst({
            where: eq(teachers.id, req.params.id),
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

teachersRouter.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

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