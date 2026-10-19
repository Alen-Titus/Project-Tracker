import { getMemberWithTasks, getUserWorkspaceRole } from "@/actions/members"
import { getMemberResources } from "@/actions/resources"
import { notFound } from "next/navigation"
import { EditMemberDialog } from "@/components/edit-member-dialog"
import { MemberWorkload } from "@/components/member-workload"
import { MemberResources } from "@/components/member-resources"
import { User, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { auth } from "@/auth"

export default async function TeamMemberProfilePage({
  params,
}: {
  params: Promise<{ id: string; workspaceId: string }>
}) {
  const { id, workspaceId } = await params
  const [member, { isAdmin }, session, resourceData] = await Promise.all([
    getMemberWithTasks(workspaceId, id),
    getUserWorkspaceRole(workspaceId),
    auth(),
    getMemberResources(workspaceId, id)
  ])

  if (!member || !member.user) notFound()

  const canEdit = isAdmin || member.userId === session?.user?.id

  // Group tasks by project
  const tasksByProject = member.user.tasks.reduce(
    (acc, task) => {
      const projectId = task.project.id
      if (!acc[projectId]) {
        acc[projectId] = { project: task.project, tasks: [] }
      }
      acc[projectId].tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        externalIssueLink: task.externalIssueLink,
      })
      return acc
    },
    {} as Record<
      string,
      {
        project: { id: string; name: string; description: string | null }
        tasks: Array<{
          id: string
          title: string
          description: string | null
          status: string
          externalIssueLink: string | null
        }>
      }
    >
  )

  const projectGroups = Object.values(tasksByProject)

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href={`/${workspaceId}/team`}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Team Directory
        </Link>
      </div>

      {/* Profile Header & Edit Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center shrink-0 border">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{member.user.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
              {member.role ? (
                <span className="font-medium text-foreground bg-secondary px-2 py-0.5 rounded text-xs">
                  {member.role}
                </span>
              ) : (
                <span className="italic text-xs">No role specified</span>
              )}
              {member.user.email && <span>{member.user.email}</span>}
              <span className="text-xs">
                • Added {new Date(member.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Edit & Delete Dialog (Admins or Self) */}
        {canEdit && (
          <div className="shrink-0">
            <EditMemberDialog workspaceId={workspaceId} member={member} />
          </div>
        )}
      </div>

      {/* Allocated Resources Section (Admins see all; members see their own) */}
      <MemberResources
        workspaceId={workspaceId}
        memberId={id}
        memberUserId={member.userId}
        memberName={member.user.name || "Member"}
        canView={resourceData.canView}
        isAdmin={isAdmin}
        isSelf={resourceData.isSelf || false}
        resources={resourceData.resources as any}
      />

      {/* Workload Section with Interactive Dropdowns */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold">Assigned Tasks by Project</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click on any project to expand or collapse the list of tasks assigned to {member.user.name}.
          </p>
        </div>

        <MemberWorkload
          workspaceId={workspaceId}
          memberName={member.user.name || "Unknown"}
          projectGroups={projectGroups}
        />
      </div>
    </div>
  )
}
