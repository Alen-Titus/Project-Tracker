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

export async function createTask(workspaceId: string, formData: FormData) {
  await verifyMembership(workspaceId)
  const title = formData.get("title") as string
  const description = formData.get("description") as string | null
  const projectId = formData.get("projectId") as string
  const assigneeId = formData.get("assigneeId") as string | null
  const reviewerId = formData.get("reviewerId") as string | null
  const status = (formData.get("status") as string) || "TODO"
  const priority = (formData.get("priority") as string) || "MEDIUM"
  const dueDateStr = formData.get("dueDate") as string | null
  const externalIssueLink = formData.get("externalIssueLink") as string | null

  if (!title || !title.trim() || !projectId) return

  const validAssigneeId =
    assigneeId && assigneeId !== "unassigned" && assigneeId.trim() !== ""
      ? assigneeId.trim()
      : null

  const validReviewerId =
    reviewerId && reviewerId !== "unassigned" && reviewerId.trim() !== ""
      ? reviewerId.trim()
      : null

  const parsedDueDate = dueDateStr ? new Date(dueDateStr) : null

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      status,
      priority,
      workspaceId,
      projectId,
      assigneeId: validAssigneeId,
      reviewerId: validReviewerId,
      dueDate: parsedDueDate && !isNaN(parsedDueDate.getTime()) ? parsedDueDate : null,
      externalIssueLink: externalIssueLink?.trim() || null,
    },
  })

  const currentUser = await verifyMembership(workspaceId)

  await recordTaskActivity(
    task.id,
    currentUser.id,
    "TASK_CREATED",
    "created this task"
  )

  if (validAssigneeId && validAssigneeId !== currentUser.id) {
    await prisma.notification.create({
      data: {
        userId: validAssigneeId,
        workspaceId,
        message: `${currentUser.name || 'Someone'} assigned you to "${task.title}"`,
        link: `/${workspaceId}/projects/${projectId}`
      }
    })
  }

  if (validReviewerId && validReviewerId !== currentUser.id && validReviewerId !== validAssigneeId) {
    await prisma.notification.create({
      data: {
        userId: validReviewerId,
        workspaceId,
        message: `${currentUser.name || 'Someone'} added you as reviewer on "${task.title}"`,
        link: `/${workspaceId}/projects/${projectId}`
      }
    })
  }

  revalidatePath(`/${workspaceId}/projects/${projectId}`)
  revalidatePath(`/${workspaceId}/team`)
  revalidatePath(`/${workspaceId}`)
}

function formatStatusLabel(s: string) {
  switch (s) {
    case "TO_BE_PLANNED": return "To Be Planned"
    case "TODO": return "To Do"
    case "IN_PROGRESS": return "In Progress"
    case "IN_PROGRESS_DELAYED": return "In Progress - Delayed"
    case "DONE": return "Done"
    default: return s.replaceAll("_", " ")
  }
}

async function recordTaskActivity(
  taskId: string, 
  userId: string | null | undefined, 
  action: string, 
  details: string
) {
  try {
    await prisma.taskActivity.create({
      data: {
        taskId,
        userId: userId || null,
        action,
        details,
      }
    })
  } catch (err) {
    console.error("Failed to record task activity:", err)
  }
}

export async function getTaskActivities(workspaceId: string, taskId: string) {
  await verifyMembership(workspaceId)
  if (!taskId) return []

  return await prisma.taskActivity.findMany({
    where: { taskId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

export async function updateTaskStatus(workspaceId: string, taskId: string, status: string, projectId: string) {
  const currentUser = await verifyMembership(workspaceId)
  if (!taskId) return

  const oldTask = await prisma.task.findUnique({
    where: { id: taskId, workspaceId },
    select: { status: true }
  })

  await prisma.task.update({
    where: { id: taskId, workspaceId },
    data: { status },
  })

  if (oldTask && oldTask.status !== status) {
    await recordTaskActivity(
      taskId,
      currentUser.id,
      "STATUS_CHANGE",
      `changed status from ${formatStatusLabel(oldTask.status)} to ${formatStatusLabel(status)}`
    )
  }

  revalidatePath(`/${workspaceId}/projects/${projectId}`)
  revalidatePath(`/${workspaceId}/team`)
  revalidatePath(`/${workspaceId}`)
}

export async function updateTaskDetails(
  workspaceId: string, 
  taskId: string, 
  data: { 
    title?: string, 
    description?: string | null, 
    status?: string,
    priority?: string, 
    dueDate?: Date | null,
    assigneeId?: string | null,
    reviewerId?: string | null,
    externalIssueLink?: string | null
  }, 
  projectId: string
) {
  const currentUser = await verifyMembership(workspaceId)
  if (!taskId) return

  const oldTask = await prisma.task.findUnique({ 
    where: { id: taskId, workspaceId },
    include: { assignee: true, reviewer: true }
  })
  
  let newAssigneeId: string | null | undefined = undefined
  if (data.assigneeId !== undefined) {
    newAssigneeId = (!data.assigneeId || data.assigneeId === "unassigned") ? null : data.assigneeId
  }

  let newReviewerId: string | null | undefined = undefined
  if (data.reviewerId !== undefined) {
    newReviewerId = (!data.reviewerId || data.reviewerId === "unassigned") ? null : data.reviewerId
  }

  const updateData: any = {}
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.description !== undefined) updateData.description = data.description?.trim() || null
  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate
  if (data.externalIssueLink !== undefined) updateData.externalIssueLink = data.externalIssueLink?.trim() || null
  if (data.assigneeId !== undefined) updateData.assigneeId = newAssigneeId
  if (data.reviewerId !== undefined) updateData.reviewerId = newReviewerId

  const updatedTask = await prisma.task.update({
    where: { id: taskId, workspaceId },
    data: updateData,
  })

  // Audit activities
  if (oldTask) {
    if (data.status && data.status !== oldTask.status) {
      await recordTaskActivity(
        taskId,
        currentUser.id,
        "STATUS_CHANGE",
        `changed status from ${formatStatusLabel(oldTask.status)} to ${formatStatusLabel(data.status)}`
      )
    }

    if (data.priority && data.priority !== oldTask.priority) {
      await recordTaskActivity(
        taskId,
        currentUser.id,
        "PRIORITY_CHANGE",
        `changed priority from ${oldTask.priority} to ${data.priority}`
      )
    }

    if (newAssigneeId !== undefined && newAssigneeId !== oldTask.assigneeId) {
      if (newAssigneeId) {
        const newAssignee = await prisma.user.findUnique({ where: { id: newAssigneeId }, select: { name: true, email: true } })
        await recordTaskActivity(
          taskId,
          currentUser.id,
          "ASSIGNEE_CHANGE",
          `assigned task to ${newAssignee?.name || newAssignee?.email || 'team member'}`
        )
      } else {
        await recordTaskActivity(taskId, currentUser.id, "ASSIGNEE_CHANGE", "unassigned this task")
      }
    }

    if (newReviewerId !== undefined && newReviewerId !== oldTask.reviewerId) {
      if (newReviewerId) {
        const newReviewer = await prisma.user.findUnique({ where: { id: newReviewerId }, select: { name: true, email: true } })
        await recordTaskActivity(
          taskId,
          currentUser.id,
          "REVIEWER_CHANGE",
          `assigned ${newReviewer?.name || newReviewer?.email || 'team member'} as reviewer`
        )
      } else {
        await recordTaskActivity(taskId, currentUser.id, "REVIEWER_CHANGE", "removed task reviewer")
      }
    }
  }

  // Notify if assignee changed and isn't the current user
  if (
    newAssigneeId && 
    oldTask?.assigneeId !== newAssigneeId && 
    newAssigneeId !== currentUser.id
  ) {
    await prisma.notification.create({
      data: {
        userId: newAssigneeId,
        workspaceId,
        message: `${currentUser.name || 'Someone'} assigned you to "${updatedTask.title}"`,
        link: `/${workspaceId}/projects/${projectId}`
      }
    })
  }

  // Notify if reviewer changed and isn't the current user
  if (
    newReviewerId && 
    oldTask?.reviewerId !== newReviewerId && 
    newReviewerId !== currentUser.id
  ) {
    await prisma.notification.create({
      data: {
        userId: newReviewerId,
        workspaceId,
        message: `${currentUser.name || 'Someone'} added you as reviewer on "${updatedTask.title}"`,
        link: `/${workspaceId}/projects/${projectId}`
      }
    })
  }

  revalidatePath(`/${workspaceId}/projects/${projectId}`)
  revalidatePath(`/${workspaceId}/team`)
  revalidatePath(`/${workspaceId}`)
  return updatedTask
}

export async function deleteTask(workspaceId: string, taskId: string, projectId: string) {
  await verifyMembership(workspaceId)
  if (!taskId) return

  await prisma.task.delete({
    where: { id: taskId, workspaceId },
  })

  revalidatePath(`/${workspaceId}/projects/${projectId}`)
  revalidatePath(`/${workspaceId}/team`)
}
