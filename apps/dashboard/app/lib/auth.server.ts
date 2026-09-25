import { redirect } from "react-router";
import type { AuthUser, UserRole } from "@khdev/contracts";
import { api, ApiError } from "./api.server";
import { getToken } from "./session.server";

export async function getUser(request: Request): Promise<AuthUser | null> {
  if (!(await getToken(request))) return null;
  try {
    return await api<AuthUser>(request, "/auth/me");
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

export async function requireUser(request: Request): Promise<AuthUser> {
  if (!(await getToken(request))) throw redirect("/login");
  return api<AuthUser>(request, "/auth/me");
}

export async function requireRole(request: Request, role: UserRole): Promise<AuthUser> {
  const user = await requireUser(request);
  if (user.role !== role) throw redirect("/");
  return user;
}

export const homePath = (user: AuthUser) => (user.role === "admin" ? "/admin/keys" : "/keys");
