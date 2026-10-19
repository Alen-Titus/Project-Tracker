"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { getUserWorkspaceRole, verifyAdmin } from "@/actions/members"

async function verifyMembership(workspaceId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } }
  })
  if (!membership) throw new Error("Forbidden")
  return { ...session.user, role: membership.role }
}

/**
 * Get resources allocated to a specific member.
 * Access control: Admin can see any member's resources; regular members can only see their own.
 */
export async function getMemberResources(workspaceId: string, memberId: string) {
  const currentUser = await verifyMembership(workspaceId)
  const { isAdmin } = await getUserWorkspaceRole(workspaceId)

  // Find member record
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    select: { userId: true, user: { select: { name: true, email: true } } }
  })

  if (!member) return { canView: false, resources: [] }

  const isSelf = member.userId === currentUser.id
  const canView = isAdmin || isSelf

  if (!canView) {
    return { canView: false, isSelf: false, isAdmin, resources: [] }
  }

  const resources = await prisma.resource.findMany({
    where: {
      workspaceId,
      userId: member.userId
    },
    orderBy: { createdAt: "desc" }
  })

  return { canView: true, isSelf, isAdmin, resources }
}

/**
 * Get all resources allocated in the workspace.
 * Access control: Admin sees all; regular members see only their own.
 */
export async function getWorkspaceResources(workspaceId: string) {
  const currentUser = await verifyMembership(workspaceId)
  const { isAdmin } = await getUserWorkspaceRole(workspaceId)

  const whereClause = isAdmin
    ? { workspaceId }
    : { workspaceId, userId: currentUser.id }

  const resources = await prisma.resource.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return {
    isAdmin,
    resources
  }
}

/**
 * Get currently logged-in user's allocated resources in this workspace.
 */
export async function getMyAllocatedResources(workspaceId: string) {
  const currentUser = await verifyMembership(workspaceId)

  const resources = await prisma.resource.findMany({
    where: {
      workspaceId,
      userId: currentUser.id
    },
    orderBy: { createdAt: "desc" }
  })

  return resources
}

/**
 * Allocate a new resource to a member (Admin only)
 */
export async function allocateResource(
  workspaceId: string,
  data: {
    userId: string
    name: string
    type?: string
    identifier?: string
    specs?: string
    status?: string
    accessInfo?: string
    notes?: string
    expiresAt?: string | null
  }
) {
  await verifyAdmin(workspaceId)

  if (!data.userId) throw new Error("Member assignment is required.")
  if (!data.name || !data.name.trim()) throw new Error("Resource name is required.")

  const resource = await prisma.resource.create({
    data: {
      name: data.name.trim(),
      type: data.type?.trim() || "VM",
      identifier: data.identifier?.trim() || null,
      specs: data.specs?.trim() || null,
      status: data.status?.trim() || "ACTIVE",
      accessInfo: data.accessInfo?.trim() || null,
      notes: data.notes?.trim() || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      userId: data.userId,
      workspaceId
    }
  })

  revalidatePath(`/${workspaceId}/team`)
  revalidatePath(`/${workspaceId}`)

  return { success: true, resource }
}

/**
 * Update an allocated resource (Admin only)
 */
export async function updateResource(
  workspaceId: string,
  resourceId: string,
  data: {
    name?: string
    type?: string
    identifier?: string | null
    specs?: string | null
    status?: string
    accessInfo?: string | null
    notes?: string | null
    expiresAt?: string | null
    userId?: string
  }
) {
  await verifyAdmin(workspaceId)

  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, workspaceId }
  })
  if (!existing) throw new Error("Resource not found.")

  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.type !== undefined) updateData.type = data.type.trim()
  if (data.identifier !== undefined) updateData.identifier = data.identifier?.trim() || null
  if (data.specs !== undefined) updateData.specs = data.specs?.trim() || null
  if (data.status !== undefined) updateData.status = data.status.trim()
  if (data.accessInfo !== undefined) updateData.accessInfo = data.accessInfo?.trim() || null
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
  if (data.expiresAt !== undefined) {
    updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null
  }
  if (data.userId !== undefined) updateData.userId = data.userId

  const updated = await prisma.resource.update({
    where: { id: resourceId },
    data: updateData
  })

  revalidatePath(`/${workspaceId}/team`)
  revalidatePath(`/${workspaceId}`)

  return { success: true, resource: updated }
}

/**
 * Deallocate / Delete a resource (Admin only)
 */
export async function deleteResource(workspaceId: string, resourceId: string) {
  await verifyAdmin(workspaceId)

  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, workspaceId }
  })
  if (!existing) throw new Error("Resource not found.")

  await prisma.resource.delete({
    where: { id: resourceId }
  })

  revalidatePath(`/${workspaceId}/team`)
  revalidatePath(`/${workspaceId}`)

  return { success: true }
}
