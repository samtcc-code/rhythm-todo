import type { Request, Response } from "express";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";
import { jwtVerify } from "jose";

export async function createContext({ req, res }: { req: Request; res: Response }) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return { user: null, res };

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");
    const { payload } = await jwtVerify(token, secret);
    const openId = payload.openId as string;
    const user = await db.getUserByOpenId(openId);
    return { user: user ?? null, res };
  } catch {
    return { user: null, res };
  }
}
