import { getProjectById } from "@/actions/projects"
import { getMembers, getUserWorkspaceRole } from "@/actions/members"
import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { KanbanBoard } from "@/components/kanban-board"
import { CreateTaskDialog } from "@/components/create-task-dialog"
import { DeleteProjectButton } from "@/components/delete-project-button"
import { EditableProjectName } from "@/components/editable-project-name"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string; workspaceId: string }>
}) {
  const { id, workspaceId } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const [project, members, { isAdmin }] = await Promise.all([
    getProjectById(workspaceId, id),
    getMembers(workspaceId),
    getUserWorkspaceRole(workspaceId)
  ])

  if (!project) notFound()

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Back button and breadcrumbs */}
      <div>
        <Link
          href={`/${workspaceId}/projects`}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
        </Link>
      </div>

      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 shrink-0 pb-2 border-b">
        <div className="flex-1 max-w-lg">
          <EditableProjectName workspaceId={workspaceId} projectId={project.id} initialName={project.name} />
          {project.description ? (
            <p className="text-muted-foreground mt-1 text-sm">{project.description}</p>
          ) : (
            <p className="text-muted-foreground/60 italic mt-0.5 text-xs">
              No description provided
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <DeleteProjectButton workspaceId={workspaceId} projectId={project.id} projectName={project.name} />
          )}
          <CreateTaskDialog
            workspaceId={workspaceId}
            projectId={project.id}
            members={members.map((m) => ({ id: m.userId, name: m.user.name || "Unknown" }))}
          />
        </div>
      </div>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        <KanbanBoard 
          workspaceId={workspaceId} 
          tasks={project.tasks} 
          projectId={project.id} 
          members={members.map((m) => ({ id: m.userId, name: m.user.name || "Unknown" }))}
          currentUser={{ id: session.user?.id || "" }}
        />
      </div>
    </div>
  )
}
