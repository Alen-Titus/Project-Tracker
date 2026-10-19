"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { LayoutDashboard, FolderKanban, Users, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"

import { signOut } from "next-auth/react"
import { UserProfileDialog } from "@/components/user-profile-dialog"

type Workspace = { id: string, name: string }

export function Sidebar({ 
  workspaces = [],
  currentUser
}: { 
  workspaces?: Workspace[]
  currentUser?: { name?: string | null, email?: string | null }
}) {
  const pathname = usePathname()
  const params = useParams()
  const workspaceId = params?.workspaceId as string

  const navigation = [
    { name: "Dashboard", href: `/${workspaceId}`, icon: LayoutDashboard },
    { name: "Projects", href: `/${workspaceId}/projects`, icon: FolderKanban },
    { name: "Team", href: `/${workspaceId}/team`, icon: Users },
  ]

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">
      <div className="p-4 border-b">
        <WorkspaceSwitcher workspaces={workspaces} currentWorkspaceId={workspaceId} />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${workspaceId}` && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-secondary/50 text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t space-y-1">
        {currentUser && (
          <UserProfileDialog workspaceId={workspaceId} user={currentUser} />
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-primary transition-colors cursor-pointer text-left"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
