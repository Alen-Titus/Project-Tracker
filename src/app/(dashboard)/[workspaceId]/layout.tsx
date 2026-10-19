import { Sidebar } from "@/components/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { CommandMenu } from "@/components/command-menu"
import { NotificationsPopover } from "@/components/notifications-popover"
import { CopilotPanel } from "@/components/copilot-panel"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [memberships, dbUser] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: { workspace: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true }
    })
  ])
  
  const workspaces = memberships.map(m => m.workspace)
  const currentUser = dbUser || session.user

  return (
    <>
      <Sidebar workspaces={workspaces} currentUser={currentUser} />
      <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 overflow-hidden relative">
        <header className="h-14 border-b flex items-center justify-between px-6 bg-card shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-lg md:hidden">Project Tracker</h1>
            <CommandMenu />
          </div>
          <div className="flex items-center gap-3">
            <NotificationsPopover workspaceId={workspaceId} />
            <ModeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
        
        <CopilotPanel workspaceId={workspaceId} />
      </div>
    </>
  )
}
