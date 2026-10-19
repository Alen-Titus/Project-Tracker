import { getProjects } from "@/actions/projects"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { FolderKanban, ArrowRight } from "lucide-react"
import Link from "next/link"

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const projects = await getProjects(workspaceId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workspaces (Projects)</h2>
          <p className="text-sm text-muted-foreground">
            Each project serves as an isolated workspace with its own Kanban board.
          </p>
        </div>
        <CreateProjectDialog workspaceId={workspaceId} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link key={project.id} href={`/${workspaceId}/projects/${project.id}`}>
            <Card className="hover:border-primary transition-all shadow-xs h-full flex flex-col group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="group-hover:text-primary transition-colors text-lg">
                    {project.name}
                  </CardTitle>
                  <FolderKanban className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                </div>
                <CardDescription className="line-clamp-2 text-xs mt-1">
                  {project.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4 text-xs text-muted-foreground flex justify-between items-center border-t">
                <span className="font-medium text-foreground">
                  {project._count.tasks} task{project._count.tasks === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                  Open Board <ArrowRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl bg-card/40">
            <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium text-base">No project workspaces yet.</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Click &quot;New Project&quot; above to create your first workspace.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
