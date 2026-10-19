import { getMembers, getUserWorkspaceRole } from "@/actions/members"
import { getWorkspaceResources } from "@/actions/resources"
import { TeamDirectoryTabs } from "@/components/team-directory-tabs"
import { auth } from "@/auth"

export default async function TeamPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const [members, { isAdmin }, resourceData, session] = await Promise.all([
    getMembers(workspaceId),
    getUserWorkspaceRole(workspaceId),
    getWorkspaceResources(workspaceId),
    auth(),
  ])

  return (
    <TeamDirectoryTabs
      workspaceId={workspaceId}
      members={members as any}
      resources={resourceData.resources}
      isAdmin={isAdmin}
      currentUserId={session?.user?.id || ""}
    />
  )
}
