"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"

async function verifyMembership(workspaceId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } }
  })
  if (!membership) throw new Error("Forbidden")
  return session.user
}

export async function getProjects(workspaceId: string) {
  await verifyMembership(workspaceId)
  return await prisma.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true } } },
  })
}

export async function getProjectById(workspaceId: string, id: string) {
  await verifyMembership(workspaceId)
  return await prisma.project.findFirst({
    where: { id, workspaceId },
    include: {
      tasks: {
        include: {
          assignee: true,
          reviewer: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })
}

export async function createProject(workspaceId: string, formData: FormData) {
  await verifyMembership(workspaceId)
  const name = formData.get("name") as string
  const description = formData.get("description") as string | null

  if (!name || !name.trim()) return

  await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      workspaceId,
    },
  })

  revalidatePath(`/${workspaceId}/projects`)
}

async function verifyAdmin(workspaceId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } }
  })
  if (!membership) throw new Error("Forbidden")
  const totalMembers = await prisma.workspaceMember.count({ where: { workspaceId } })
  const roleUpper = membership.role?.toUpperCase() || ""
  const isAdmin = totalMembers <= 1 || roleUpper === "OWNER" || roleUpper === "ADMIN"
  if (!isAdmin) {
    throw new Error("Admin privileges required to delete a project")
  }
  return session.user
}

export async function deleteProject(workspaceId: string, id: string) {
  await verifyAdmin(workspaceId)
  if (!id) return

  await prisma.project.delete({
    where: { id, workspaceId },
  })

  revalidatePath(`/${workspaceId}/projects`)
  redirect(`/${workspaceId}/projects`)
}

export async function updateProjectName(workspaceId: string, id: string, name: string) {
  await verifyMembership(workspaceId)
  if (!id || !name.trim()) return

  await prisma.project.update({
    where: { id, workspaceId },
    data: { name: name.trim() }
  })

  revalidatePath(`/${workspaceId}/projects/${id}`)
  revalidatePath(`/${workspaceId}/projects`)
}
