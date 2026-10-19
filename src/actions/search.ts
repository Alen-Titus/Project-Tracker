"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function searchWorkspace(workspaceId: string, query: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Ensure user has access
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } }
  })
  if (!membership) throw new Error("Forbidden")

  if (!query || query.trim().length < 2) {
    return { tasks: [], projects: [], members: [] }
  }

  const q = query.trim()

  const [tasks, projects, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        workspaceId,
        OR: [
          { title: { contains: q } },
          { id: { contains: q } }
        ]
      },
      take: 5,
      select: { id: true, title: true, status: true, projectId: true }
    }),
    prisma.project.findMany({
      where: {
        workspaceId,
        name: { contains: q }
      },
      take: 3,
      select: { id: true, name: true }
    }),
    prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        user: { name: { contains: q } }
      },
      take: 3,
      include: { user: { select: { name: true, email: true } } }
    })
  ])

  return { tasks, projects, members }
}
