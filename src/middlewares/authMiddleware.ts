import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  teacherId: string;
  email: string;
};

const jwtSecretFromEnv = process.env["JWT_SECRET"];

if (!jwtSecretFromEnv) {
  throw new Error("JWT_SECRET is required in environment variables");
}

const jwtSecret: string = jwtSecretFromEnv;

function getBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    const payload = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    res.locals["auth"] = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export { jwtSecret };