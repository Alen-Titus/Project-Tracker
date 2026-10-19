import { streamText, convertToCoreMessages } from 'ai'
import { createAzure } from '@ai-sdk/azure'
import { z } from 'zod'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

const getAzureProvider = () => {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || ""
  let resourceName = process.env.AZURE_RESOURCE_NAME
  if (!resourceName && endpoint) {
    const match = endpoint.match(/https:\/\/([^.]+)\.cognitiveservices\.azure\.com/i)
    if (match && match[1]) {
      resourceName = match[1]
    }
  }

  if (!resourceName || !process.env.AZURE_OPENAI_API_KEY) {
    throw new Error("Azure OpenAI is not fully configured.")
  }

  return createAzure({
    resourceName,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  })
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
    const currentUserId = session.user.id

    const { messages, workspaceId } = await req.json()
    if (!workspaceId) return new Response('Missing workspaceId', { status: 400 })

    // Verify membership in current workspace
    const currentMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: currentUserId } },
      include: { workspace: true }
    })
    if (!currentMembership) return new Response('Forbidden', { status: 403 })

    const azure = getAzureProvider()
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt5.4min"

    // Helper: resolve workspace id by id or name
    const resolveWorkspace = async (targetId?: string, targetName?: string) => {
      if (targetId) {
        const mem = await prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: targetId, userId: currentUserId } },
          include: { workspace: true }
        })
        return mem ? mem.workspace : null
      }
      if (targetName && targetName.trim()) {
        const mem = await prisma.workspaceMember.findFirst({
          where: {
            userId: currentUserId,
            workspace: { name: { contains: targetName.trim() } }
          },
          include: { workspace: true }
        })
        return mem ? mem.workspace : null
      }
      return currentMembership.workspace
    }

    const result = await streamText({
      // @ts-ignore
      model: azure(deploymentName),
      messages: convertToCoreMessages(messages),
      system: `You are the Project Tracker AI Copilot. You help the user manage their workspaces, projects, team members, and tasks.
Current User ID: ${currentUserId}
Current User Name: ${session.user.name || 'User'}
Current Workspace: "${currentMembership.workspace.name}" (ID: ${workspaceId})

CAPABILITIES:
1. You can list all workspaces the user has access to with 'getUserWorkspaces'.
2. You can create a brand new workspace with 'createWorkspace'.
3. You can fetch projects, tasks, and members for any workspace with 'getWorkspaceData'.
4. You can create projects and tasks in the current workspace OR in any other workspace the user belongs to.
5. You can assign tasks and manage team members.
6. You can check what resources (VMs, cloud instances, hardware, licenses) have been allocated with 'getMemberResources', and allocate resources with 'allocateResource' (if admin).

RULES:
- When the user asks to create a new workspace, call 'createWorkspace'.
- When the user asks about tasks, projects, or team in another workspace, or to add a task in another workspace, first call 'getUserWorkspaces' or specify the target workspace in 'getWorkspaceData' / 'createTask'.
- When the user asks what resources or VMs are allocated to a member or to themselves, call 'getMemberResources'.
- When an admin asks to allocate a VM or resource to a member, call 'allocateResource'.
- If the user specifies a project name or workspace name directly, use those parameters.
- After tool execution, provide a clear, concise, and helpful confirmation text to the user.`,
      tools: {
        getUserWorkspaces: {
          description: 'List all workspaces the current user belongs to, including IDs, names, and user role.',
          parameters: z.object({}),
          execute: async () => {
            const memberships = await prisma.workspaceMember.findMany({
              where: { userId: currentUserId },
              include: { workspace: { select: { id: true, name: true, createdAt: true } } },
              orderBy: { createdAt: 'desc' }
            })
            return memberships.map(m => ({
              workspaceId: m.workspace.id,
              name: m.workspace.name,
              role: m.role,
              isCurrentWorkspace: m.workspace.id === workspaceId
            }))
          }
        },

        createWorkspace: {
          description: 'Create a brand new workspace for the current user. Also provisions an initial project.',
          parameters: z.object({
            name: z.string().describe('The name of the new workspace'),
            initialProjectName: z.string().optional().describe('Optional name for the first project in this workspace (defaults to "General")')
          }),
          execute: async ({ name, initialProjectName }: { name: string, initialProjectName?: string }) => {
            if (!name || !name.trim()) {
              return { success: false, message: 'Workspace name is required.' }
            }

            const newWorkspace = await prisma.workspace.create({
              data: {
                name: name.trim(),
                members: {
                  create: {
                    userId: currentUserId,
                    role: 'OWNER'
                  }
                },
                projects: {
                  create: {
                    name: initialProjectName?.trim() || 'General',
                    description: 'Initial project'
                  }
                }
              },
              include: {
                projects: true
              }
            })

            return {
              success: true,
              workspace: {
                id: newWorkspace.id,
                name: newWorkspace.name,
                initialProject: newWorkspace.projects[0]
              },
              message: `Created workspace "${newWorkspace.name}" with project "${newWorkspace.projects[0]?.name}". Switch to it anytime from the workspace switcher.`
            }
          }
        },

        getWorkspaceData: {
          description: 'Fetch all projects, tasks, and team members for a workspace. Defaults to current workspace if targetWorkspaceId or targetWorkspaceName is omitted.',
          parameters: z.object({
            targetWorkspaceId: z.string().optional().describe('Optional workspace ID to inspect.'),
            targetWorkspaceName: z.string().optional().describe('Optional workspace name to inspect.')
          }),
          execute: async ({ targetWorkspaceId, targetWorkspaceName }: { targetWorkspaceId?: string, targetWorkspaceName?: string }) => {
            const targetWs = await resolveWorkspace(targetWorkspaceId, targetWorkspaceName)
            if (!targetWs) {
              return { error: 'Could not find the requested workspace or you are not a member.' }
            }

            const [projects, tasks, members] = await Promise.all([
              prisma.project.findMany({ where: { workspaceId: targetWs.id }, select: { id: true, name: true, description: true } }),
              prisma.task.findMany({ 
                where: { workspaceId: targetWs.id }, 
                select: { id: true, title: true, status: true, priority: true, assigneeId: true, reviewerId: true, projectId: true } 
              }),
              prisma.workspaceMember.findMany({ 
                where: { workspaceId: targetWs.id }, 
                include: { user: { select: { id: true, name: true, email: true } } } 
              })
            ])

            return { 
              workspace: { id: targetWs.id, name: targetWs.name },
              projects, 
              tasks, 
              members: members.map(m => ({ id: m.userId, name: m.user.name, email: m.user.email, role: m.role }))
            }
          }
        },

        createProject: {
          description: 'Create a new project in a workspace (current or another specified workspace).',
          parameters: z.object({
            name: z.string().describe('The project name'),
            description: z.string().optional().describe('Project description'),
            targetWorkspaceId: z.string().optional().describe('Optional ID of target workspace'),
            targetWorkspaceName: z.string().optional().describe('Optional name of target workspace')
          }),
          execute: async ({ name, description, targetWorkspaceId, targetWorkspaceName }: { name: string, description?: string, targetWorkspaceId?: string, targetWorkspaceName?: string }) => {
            const targetWs = await resolveWorkspace(targetWorkspaceId, targetWorkspaceName)
            if (!targetWs) {
              return { error: 'Target workspace not found or you do not have access.' }
            }

            const project = await prisma.project.create({
              data: {
                name: name.trim(),
                description: description?.trim() || null,
                workspaceId: targetWs.id
              }
            })

            return {
              success: true,
              project: {
                id: project.id,
                name: project.name,
                workspace: targetWs.name
              }
            }
          }
        },

        createTask: {
          description: 'Create a new task. Can target a project in the current workspace OR in another workspace specified by targetWorkspaceName/targetWorkspaceId.',
          parameters: z.object({
            title: z.string().describe('The task title'),
            projectId: z.string().optional().describe('The ID of the project to add the task to'),
            projectName: z.string().optional().describe('The name of the project. If not provided or not found, a project will be matched or created.'),
            targetWorkspaceId: z.string().optional().describe('Optional ID of the target workspace'),
            targetWorkspaceName: z.string().optional().describe('Optional name of the target workspace (e.g. "Personal", "WebAgent")'),
            assigneeId: z.string().optional().describe('User ID to assign'),
            assigneeName: z.string().optional().describe('User name to assign (will match team member)'),
            reviewerId: z.string().optional().describe('User ID to assign as reviewer'),
            priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Task priority (default: MEDIUM)'),
            status: z.enum(['TO_BE_PLANNED', 'TODO', 'IN_PROGRESS', 'IN_PROGRESS_DELAYED', 'DONE']).optional().describe('Task status (default: TODO)')
          }),
          execute: async ({ 
            title, 
            projectId, 
            projectName, 
            targetWorkspaceId, 
            targetWorkspaceName, 
            assigneeId, 
            assigneeName, 
            reviewerId, 
            priority, 
            status 
          }: { 
            title: string, 
            projectId?: string, 
            projectName?: string, 
            targetWorkspaceId?: string, 
            targetWorkspaceName?: string, 
            assigneeId?: string, 
            assigneeName?: string, 
            reviewerId?: string, 
            priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', 
            status?: 'TO_BE_PLANNED' | 'TODO' | 'IN_PROGRESS' | 'IN_PROGRESS_DELAYED' | 'DONE' 
          }) => {
            const targetWs = await resolveWorkspace(targetWorkspaceId, targetWorkspaceName)
            if (!targetWs) {
              return { error: 'Target workspace not found or you do not have access.' }
            }

            // Resolve Project
            let targetProjectId = projectId
            if (!targetProjectId) {
              if (projectName && projectName.trim()) {
                let p = await prisma.project.findFirst({
                  where: { workspaceId: targetWs.id, name: { contains: projectName.trim() } }
                })
                if (!p) {
                  p = await prisma.project.create({
                    data: { name: projectName.trim(), workspaceId: targetWs.id }
                  })
                }
                targetProjectId = p.id
              } else {
                let p = await prisma.project.findFirst({ where: { workspaceId: targetWs.id } })
                if (!p) {
                  p = await prisma.project.create({
                    data: { name: 'General', workspaceId: targetWs.id }
                  })
                }
                targetProjectId = p.id
              }
            }

            // Resolve Assignee
            let targetAssigneeId = assigneeId
            if (!targetAssigneeId && assigneeName && assigneeName.trim()) {
              const member = await prisma.workspaceMember.findFirst({
                where: {
                  workspaceId: targetWs.id,
                  user: {
                    OR: [
                      { name: { contains: assigneeName.trim() } },
                      { email: { contains: assigneeName.trim() } }
                    ]
                  }
                },
                select: { userId: true }
              })
              if (member) targetAssigneeId = member.userId
            }

            const task = await prisma.task.create({
              data: {
                title: title.trim(),
                projectId: targetProjectId,
                workspaceId: targetWs.id,
                assigneeId: targetAssigneeId || null,
                reviewerId: reviewerId || null,
                priority: priority || 'MEDIUM',
                status: status || 'TODO'
              },
              include: {
                project: { select: { id: true, name: true } },
                workspace: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } }
              }
            })

            return {
              success: true,
              task: {
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                project: task.project.name,
                workspace: task.workspace.name,
                assignee: task.assignee?.name || 'Unassigned'
              },
              message: `Task "${task.title}" created in workspace "${task.workspace.name}" under project "${task.project.name}".`
            }
          }
        },

        assignTask: {
          description: 'Assign an existing task to a user.',
          parameters: z.object({
            taskId: z.string().describe('The ID of the task to update'),
            assigneeId: z.string().describe('The ID of the user to assign')
          }),
          execute: async ({ taskId, assigneeId }: { taskId: string, assigneeId: string }) => {
            const task = await prisma.task.findUnique({
              where: { id: taskId },
              select: { workspaceId: true }
            })
            if (!task) return { error: 'Task not found.' }

            // Verify membership in task workspace
            const mem = await prisma.workspaceMember.findUnique({
              where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: currentUserId } }
            })
            if (!mem) return { error: 'Forbidden' }

            const updated = await prisma.task.update({
              where: { id: taskId },
              data: { assigneeId }
            })
            return { success: true, task: updated }
          }
        },

        addWorkspaceMember: {
          description: 'Add a new member to a workspace (current or specified target workspace).',
          parameters: z.object({
            name: z.string().describe('The name of the new member'),
            email: z.string().optional().describe('The email address of the new member'),
            role: z.string().optional().describe('The role of the user (e.g. MEMBER, ADMIN, Intern). Defaults to MEMBER.'),
            targetWorkspaceId: z.string().optional().describe('Optional ID of target workspace'),
            targetWorkspaceName: z.string().optional().describe('Optional name of target workspace')
          }),
          execute: async ({ name, email, role, targetWorkspaceId, targetWorkspaceName }: { name: string, email?: string, role?: string, targetWorkspaceId?: string, targetWorkspaceName?: string }) => {
            const targetWs = await resolveWorkspace(targetWorkspaceId, targetWorkspaceName)
            if (!targetWs) {
              return { error: 'Target workspace not found or you do not have access.' }
            }

            const memberEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}@mock.example.com`
            
            // Upsert user
            let user = await prisma.user.findUnique({ where: { email: memberEmail } })
            if (!user) {
              user = await prisma.user.create({
                data: {
                  name,
                  email: memberEmail,
                  password: 'mock_password_123'
                }
              })
            }

            // Check if already in workspace
            const existingMember = await prisma.workspaceMember.findUnique({
              where: { workspaceId_userId: { workspaceId: targetWs.id, userId: user.id } }
            })

            if (existingMember) {
              return { success: true, member: existingMember, message: `User is already a member of ${targetWs.name}.` }
            }

            const newMember = await prisma.workspaceMember.create({
              data: {
                workspaceId: targetWs.id,
                userId: user.id,
                role: role || 'MEMBER'
              },
              include: {
                user: { select: { id: true, name: true, email: true } },
                workspace: { select: { id: true, name: true } }
              }
            })

            return { success: true, member: newMember, message: `Added ${name} to workspace "${targetWs.name}".` }
          }
        },

        updateUserEmail: {
          description: 'Update the email address of an existing workspace member.',
          parameters: z.object({
            userId: z.string().describe('The ID of the user to update'),
            newEmail: z.string().email().describe('The new email address')
          }),
          execute: async ({ userId, newEmail }: { userId: string, newEmail: string }) => {
            const existing = await prisma.user.findUnique({ where: { email: newEmail } })
            if (existing && existing.id !== userId) {
              return { success: false, message: 'Email address is already in use by another user.' }
            }

            const updatedUser = await prisma.user.update({
              where: { id: userId },
              data: { email: newEmail }
            })

            return { success: true, user: updatedUser }
          }
        },

        getMemberResources: {
          description: 'Get allocated resources (such as VMs, cloud instances, hardware, licenses) for a member or self in a workspace.',
          parameters: z.object({
            targetWorkspaceId: z.string().optional().describe('Workspace ID (defaults to current workspace)'),
            targetWorkspaceName: z.string().optional().describe('Workspace name to resolve if ID is unknown'),
            memberName: z.string().optional().describe('Member name to inspect resources for (if omitted, inspects current user or all if admin)')
          }),
          execute: async ({ targetWorkspaceId, targetWorkspaceName, memberName }: { targetWorkspaceId?: string, targetWorkspaceName?: string, memberName?: string }) => {
            const targetWs = await resolveWorkspace(targetWorkspaceId, targetWorkspaceName)
            if (!targetWs) return { error: 'Target workspace not found or you are not a member.' }

            const targetMem = await prisma.workspaceMember.findUnique({
              where: { workspaceId_userId: { workspaceId: targetWs.id, userId: currentUserId } }
            })
            const totalMembers = await prisma.workspaceMember.count({ where: { workspaceId: targetWs.id } })
            const roleUpper = targetMem?.role?.toUpperCase() || ''
            const isAdmin = totalMembers <= 1 || roleUpper === 'OWNER' || roleUpper === 'ADMIN'

            let targetUserId = currentUserId
            let targetUserRecord = null

            if (memberName && memberName.trim()) {
              const matchedMember = await prisma.workspaceMember.findFirst({
                where: {
                  workspaceId: targetWs.id,
                  user: { name: { contains: memberName.trim() } }
                },
                include: { user: true }
              })
              if (!matchedMember) {
                return { error: `Member matching "${memberName}" not found in workspace "${targetWs.name}".` }
              }
              targetUserId = matchedMember.userId
              targetUserRecord = matchedMember.user

              // If regular member trying to view another member's resources
              if (!isAdmin && targetUserId !== currentUserId) {
                return { error: 'Resource allocations are private. Only workspace administrators can view another member\'s allocated resources.' }
              }
            }

            const whereClause = memberName
              ? { workspaceId: targetWs.id, userId: targetUserId }
              : isAdmin
              ? { workspaceId: targetWs.id }
              : { workspaceId: targetWs.id, userId: currentUserId }

            const resources = await prisma.resource.findMany({
              where: whereClause,
              include: { user: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: 'desc' }
            })

            return {
              workspace: targetWs.name,
              isAdmin,
              resources: resources.map(r => ({
                id: r.id,
                name: r.name,
                type: r.type,
                status: r.status,
                identifier: r.identifier,
                specs: r.specs,
                accessInfo: r.accessInfo,
                notes: r.notes,
                allocatedTo: r.user.name || r.user.email,
                expiresAt: r.expiresAt ? r.expiresAt.toISOString().split('T')[0] : null
              }))
            }
          }
        },

        allocateResource: {
          description: 'Allocate a new resource (VM, cloud instance, database, hardware, license) to a team member (Admin only).',
          parameters: z.object({
            targetWorkspaceId: z.string().optional().describe('Workspace ID (defaults to current workspace)'),
            targetWorkspaceName: z.string().optional().describe('Workspace name to resolve'),
            memberName: z.string().describe('Name or email of the team member to allocate the resource to'),
            resourceName: z.string().describe('Name of the resource (e.g. "Ubuntu 22.04 LTS Dev VM", "AWS Dev Sandbox")'),
            type: z.enum(['VM', 'CLOUD_INSTANCE', 'DATABASE', 'HARDWARE', 'LICENSE', 'OTHER']).default('VM').describe('Resource type'),
            identifier: z.string().optional().describe('IP address, hostname, instance ID, or serial number'),
            specs: z.string().optional().describe('Hardware / machine specifications e.g. "8 vCPU, 32GB RAM, 200GB SSD"'),
            status: z.enum(['ACTIVE', 'PROVISIONING', 'INACTIVE', 'DECOMMISSIONED']).default('ACTIVE').describe('Resource status'),
            accessInfo: z.string().optional().describe('Access info e.g. "ssh dev@10.0.1.5 -p 2222"'),
            notes: z.string().optional().describe('Usage purpose or notes')
          }),
          execute: async ({
            targetWorkspaceId,
            targetWorkspaceName,
            memberName,
            resourceName,
            type,
            identifier,
            specs,
            status,
            accessInfo,
            notes
          }: {
            targetWorkspaceId?: string
            targetWorkspaceName?: string
            memberName: string
            resourceName: string
            type: string
            identifier?: string
            specs?: string
            status?: string
            accessInfo?: string
            notes?: string
          }) => {
            const targetWs = await resolveWorkspace(targetWorkspaceId, targetWorkspaceName)
            if (!targetWs) return { error: 'Target workspace not found or you are not a member.' }

            const targetMem = await prisma.workspaceMember.findUnique({
              where: { workspaceId_userId: { workspaceId: targetWs.id, userId: currentUserId } }
            })
            const totalMembers = await prisma.workspaceMember.count({ where: { workspaceId: targetWs.id } })
            const roleUpper = targetMem?.role?.toUpperCase() || ''
            const isAdmin = totalMembers <= 1 || roleUpper === 'OWNER' || roleUpper === 'ADMIN'

            if (!isAdmin) {
              return { error: 'Only workspace administrators can allocate resources to members.' }
            }

            const matchedMember = await prisma.workspaceMember.findFirst({
              where: {
                workspaceId: targetWs.id,
                user: {
                  OR: [
                    { name: { contains: memberName.trim() } },
                    { email: { contains: memberName.trim() } }
                  ]
                }
              },
              include: { user: true }
            })

            if (!matchedMember) {
              return { error: `Member matching "${memberName}" not found in workspace "${targetWs.name}".` }
            }

            const resource = await prisma.resource.create({
              data: {
                name: resourceName.trim(),
                type: type || 'VM',
                identifier: identifier?.trim() || null,
                specs: specs?.trim() || null,
                status: status || 'ACTIVE',
                accessInfo: accessInfo?.trim() || null,
                notes: notes?.trim() || null,
                userId: matchedMember.userId,
                workspaceId: targetWs.id
              }
            })

            return {
              success: true,
              message: `Successfully allocated "${resource.name}" (${resource.type}) to ${matchedMember.user.name || matchedMember.user.email} in workspace "${targetWs.name}".`,
              resource: {
                id: resource.id,
                name: resource.name,
                type: resource.type,
                identifier: resource.identifier,
                specs: resource.specs,
                status: resource.status,
                allocatedTo: matchedMember.user.name || matchedMember.user.email
              }
            }
          }
        }
      },
      maxToolRoundtrips: 5,
    })

    return result.toAIStreamResponse()
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return new Response(error.message || 'Server error', { status: 500 })
  }
}
