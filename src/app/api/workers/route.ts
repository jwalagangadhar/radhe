import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";

const createSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  name: z.string().min(1),
  role: z.enum(["WORKER", "ADMIN"]).default("WORKER"),
  phone: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  username: z.string().min(3).optional(),
  password: z.string().min(4).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["WORKER", "ADMIN"]).optional(),
  active: z.boolean().optional(),
  phone: z.string().optional(),
});

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      phone: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      return jsonError("Username already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        phone: data.phone || null,
        active: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        phone: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.errors[0]?.message ?? "Invalid user data");
    }
    return jsonError("Failed to create worker", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { id: data.id },
    });

    if (!existing) {
      return jsonError("User not found", 404);
    }

    // Don't let the logged-in admin deactivate themselves or change their own role to prevent lockout
    if (existing.id === auth.id) {
      if (data.active === false) {
        return jsonError("You cannot deactivate your own account", 400);
      }
      if (data.role && data.role !== "ADMIN") {
        return jsonError("You cannot change your own admin role", 400);
      }
    }

    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.username !== undefined) updates.username = data.username;
    if (data.role !== undefined) updates.role = data.role;
    if (data.active !== undefined) updates.active = data.active;
    if (data.phone !== undefined) updates.phone = data.phone || null;
    if (data.password !== undefined && data.password.trim() !== "") {
      updates.password = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: data.id },
      data: updates,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        phone: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.errors[0]?.message ?? "Invalid update data");
    }
    return jsonError("Failed to update user", 500);
  }
}
