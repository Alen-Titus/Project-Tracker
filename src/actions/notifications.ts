"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function getNotifications(workspaceId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.notification.findMany({
    where: { 
      workspaceId, 
      userId: session.user.id 
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
}

export async function markNotificationRead(workspaceId: string, notificationId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.notification.update({
    where: { id: notificationId, userId: session.user.id },
    data: { read: true }
  })
}

export async function markAllRead(workspaceId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.notification.updateMany({
    where: { workspaceId, userId: session.user.id, read: false },
    data: { read: true }
  })
}
