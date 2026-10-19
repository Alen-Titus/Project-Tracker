"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

async function verifyMembership(workspaceId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const userId = session.user.id

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } }
  })
  if (!membership) throw new Error("Forbidden")
  return { ...session.user, id: userId }
}

export async function getComments(workspaceId: string, taskId: string) {
  await verifyMembership(workspaceId)
  return await prisma.comment.findMany({
    where: { taskId, workspaceId },
    include: {
      author: {
        select: { id: true, name: true, image: true, email: true }
      }
    },
    orderBy: { createdAt: "asc" }
  })
}

export async function addComment(workspaceId: string, taskId: string, content: string, projectId: string) {
  const user = await verifyMembership(workspaceId)
  if (!content.trim()) return

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      taskId,
      authorId: user.id,
      workspaceId
    },
    include: { task: { select: { assigneeId: true, title: true } } }
  })

  // Notify assignee if someone else commented on their task
  const assigneeId = comment.task.assigneeId
  if (assigneeId && assigneeId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: assigneeId,
        workspaceId,
        message: `${user.name || 'Someone'} commented on "${comment.task.title}"`,
        link: `/${workspaceId}/projects/${projectId}`
      }
    })
  }

  revalidatePath(`/${workspaceId}/projects/${projectId}`)
}

export async function deleteComment(workspaceId: string, commentId: string, projectId: string) {
  const user = await verifyMembership(workspaceId)
  
  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment) return
  
  // Only author can delete their own comment
  if (comment.authorId !== user.id) throw new Error("Forbidden")

  await prisma.comment.delete({
    where: { id: commentId, workspaceId }
  })

  revalidatePath(`/${workspaceId}/projects/${projectId}`)
}
