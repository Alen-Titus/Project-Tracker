import { getProjects } from "@/actions/projects"
import { getMembers } from "@/actions/members"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderKanban, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DashboardMyTasks } from "@/components/dashboard-my-tasks"

export default async function Dashboard({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const session = await auth()
  if (!session?.user?.id) notFound()

  // Find all workspaces the user has membership in
  const userMemberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: true }
  })
  const userWorkspaceIds = userMemberships.map(m => m.workspaceId)
  const currentWorkspace = userMemberships.find(m => m.workspaceId === workspaceId)?.workspace

  const [projects, members, allMyTasks] = await Promise.all([
    getProjects(workspaceId),
    getMembers(workspaceId),
    prisma.task.findMany({
      where: {
        workspaceId: { in: userWorkspaceIds },
        OR: [
          { assigneeId: session.user.id },
          { reviewerId: session.user.id }
        ],
        status: { not: "DONE" }
      },
      include: {
        project: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    })
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Work</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Welcome back, {session.user.name?.split(" ")[0] || "there"}. Here&apos;s what&apos;s on your plate.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* My Tasks Section */}
        <div className="lg:col-span-2 space-y-4">
          <DashboardMyTasks
            tasks={allMyTasks}
            currentWorkspaceId={workspaceId}
            currentWorkspaceName={currentWorkspace?.name || "This Workspace"}
            currentUserId={session.user.id}
          />
        </div>

        {/* Workspace Overview Sidebar */}
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Workspace Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href={`/${workspaceId}/projects`} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">Projects</p>
                    <p className="text-xs text-muted-foreground">{projects.length} active</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              
              <Link href={`/${workspaceId}/team`} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">Team Members</p>
                    <p className="text-xs text-muted-foreground">{members.length} members</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
