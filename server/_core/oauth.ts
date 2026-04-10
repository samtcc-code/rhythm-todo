import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { SignJWT } from "jose";

const USERS = [
  {
    openId: "sam",
    name: "Sam",
    email: "sam@thecontinuity.co",
    password: process.env.SAM_PASSWORD ?? "sam123",
  },
  {
    openId: "team",
    name: "Team",
    email: "team@thecontinuity.co",
    password: process.env.TEAM_PASSWORD ?? "team123",
  },
];

async function createSessionToken(openId: string, name: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");
  return new SignJWT({ openId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1y")
    .sign(secret);
}

export function registerOAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: "Password required" });
      return;
    }
    const user = USERS.find(u => u.password === password);
    if (!user) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }
    await db.upsertUser({
      openId: user.openId,
      name: user.name,
      email: user.email,
      loginMethod: "password",
      lastSignedIn: new Date(),
    });
    const token = await createSessionToken(user.openId, user.name);
    const maxAgeSeconds = Math.floor(ONE_YEAR_MS / 1000);
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
    res.json({ ok: true });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    res.json({ ok: true });
  });
}
