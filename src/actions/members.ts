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
  return { ...session.user, role: membership.role }
}

export async function verifyAdmin(workspaceId: string) {
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
    throw new Error("Admin privileges required to perform this action")
  }
  return { ...session.user, role: membership.role }
}

export async function getUserWorkspaceRole(workspaceId: string) {
  const session = await auth()
  if (!session?.user?.id) return { isAdmin: false, role: null }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } }
  })
  if (!membership) return { isAdmin: false, role: null }
  const totalMembers = await prisma.workspaceMember.count({ where: { workspaceId } })
  const roleUpper = membership.role?.toUpperCase() || ""
  const isAdmin = totalMembers <= 1 || roleUpper === "OWNER" || roleUpper === "ADMIN"
  return { isAdmin, role: membership.role }
}

export async function getMembers(workspaceId: string) {
  await verifyMembership(workspaceId)
  return await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function getMemberWithTasks(workspaceId: string, memberId: string) {
  await verifyMembership(workspaceId)
  return await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: {
      user: {
        include: {
          tasks: {
            where: { workspaceId },
            include: { project: true },
            orderBy: { createdAt: "desc" }
          }
        }
      }
    }
  })
}

export async function createMember(workspaceId: string, formData: FormData) {
  await verifyMembership(workspaceId)
  const email = formData.get("email") as string
  const name = formData.get("name") as string | null
  const role = formData.get("role") as string || "MEMBER"

  if (!email || !email.trim()) return

  // Find existing user or create
  let user = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email.trim(),
        name: name?.trim() || email.trim().split('@')[0],
      }
    })
  } else if (name && name.trim() && !user.name) {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: name.trim() }
    })
  }

  // Check if user is already a member of this workspace
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } }
  })

  if (!existing) {
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role
      }
    })
  }

  revalidatePath(`/${workspaceId}/team`)
  revalidatePath(`/${workspaceId}`)
}

export async function updateMember(workspaceId: string, formData: FormData) {
  const currentUser = await verifyMembership(workspaceId)
  const id = formData.get("id") as string
  const role = formData.get("role") as string
  const name = formData.get("name") as string | null
  const email = formData.get("email") as string | null

  if (!id) return

  const member = await prisma.workspaceMember.findUnique({
    where: { id, workspaceId },
    include: { user: true }
  })
  if (!member) return

  // If modifying another member's email or role, verify admin privileges
  const isEditingOtherUser = member.userId !== currentUser.id
  if (isEditingOtherUser) {
    await verifyAdmin(workspaceId)
  }

  // Update role if provided
  if (role && role.trim()) {
    await prisma.workspaceMember.update({
      where: { id, workspaceId },
      data: { role: role.trim() }
    })
  }

  // Update user name and email
  if (member.userId) {
    const userUpdates: any = {}
    if (name !== null && name !== undefined) {
      userUpdates.name = name.trim() || null
    }
    if (email && email.trim() && email.trim() !== member.user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: email.trim() } })
      if (!existingUser || existingUser.id === member.userId) {
        userUpdates.email = email.trim()
      }
    }
    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: member.userId },
        data: userUpdates
      })
    }
  }

  revalidatePath(`/${workspaceId}/team/${id}`)
  revalidatePath(`/${workspaceId}/team`)
  revalidatePath(`/${workspaceId}`)
}

export async function deleteMember(workspaceId: string, id: string) {
  await verifyAdmin(workspaceId)
  if (!id) return

  await prisma.workspaceMember.delete({
    where: { id, workspaceId }
  })

  revalidatePath(`/${workspaceId}/team`)
  redirect(`/${workspaceId}/team`)
}

export async function updateCurrentUserProfile(
  workspaceId: string, 
  data: { name: string; email?: string }
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const { name, email } = data
  if (!name || !name.trim()) {
    throw new Error("Full Name is required.")
  }

  const userUpdates: { name: string; email?: string } = {
    name: name.trim()
  }

  if (email && email.trim()) {
    const trimmedEmail = email.trim().toLowerCase()
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true }
    })

    if (currentUser?.email !== trimmedEmail) {
      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: trimmedEmail }
      })
      if (existingUser && existingUser.id !== session.user.id) {
        throw new Error("This email is already in use by another account.")
      }
      userUpdates.email = trimmedEmail
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: userUpdates
  })

  revalidatePath(`/${workspaceId}`)
  revalidatePath(`/${workspaceId}/team`)
  revalidatePath(`/${workspaceId}/projects`)

  return { success: true, name: updatedUser.name, email: updatedUser.email }
}

export async function updateCurrentUserName(workspaceId: string, name: string) {
  return await updateCurrentUserProfile(workspaceId, { name })
}
