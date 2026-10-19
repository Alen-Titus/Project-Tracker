"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ChevronDown, FolderKanban } from "lucide-react"
import Link from "next/link"

type TaskItem = {
  id: string
  title: string
  description: string | null
  status: string
  externalIssueLink: string | null
}

type ProjectGroup = {
  project: {
    id: string
    name: string
    description: string | null
  }
  tasks: TaskItem[]
}

export function MemberWorkload({
  workspaceId,
  memberName,
  projectGroups,
}: {
  workspaceId: string
  memberName: string
  projectGroups: ProjectGroup[]
}) {
  // All projects open by default
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    projectGroups.forEach((g) => {
      initial[g.project.id] = true
    })
    return initial
  })

  const toggleProject = (projectId: string) => {
    setOpenProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }))
  }

  if (projectGroups.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-card/40">
        <p className="font-medium">No tasks currently assigned to {memberName}.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create tasks inside any project workspace and assign them to {memberName}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {projectGroups.map((group) => {
        const isOpen = !!openProjects[group.project.id]

        return (
          <div
            key={group.project.id}
            className="border rounded-xl bg-card shadow-xs overflow-hidden transition-all"
          >
            {/* Project Header Accordion Trigger */}
            <button
              type="button"
              onClick={() => toggleProject(group.project.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FolderKanban className="h-5 w-5 text-primary" />
                <span className="font-semibold text-base">{group.project.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {group.tasks.length} task{group.tasks.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {/* Collapsible Panel */}
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t bg-muted/10 space-y-3">
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border rounded-lg bg-background shadow-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {task.status === "TO_BE_PLANNED" && (
                        <Badge variant="outline" className="text-[11px] border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10">To Be Planned</Badge>
                      )}
                      {task.status === "TODO" && (
                        <Badge variant="outline" className="text-[11px] border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/10">To Do</Badge>
                      )}
                      {task.status === "IN_PROGRESS" && (
                        <Badge variant="outline" className="text-[11px] border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10">In Progress</Badge>
                      )}
                      {task.status === "IN_PROGRESS_DELAYED" && (
                        <Badge variant="outline" className="text-[11px] border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">In Progress - Delayed</Badge>
                      )}
                      {task.status === "DONE" && (
                        <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">Done</Badge>
                      )}
                      {!["TO_BE_PLANNED", "TODO", "IN_PROGRESS", "IN_PROGRESS_DELAYED", "DONE"].includes(task.status) && (
                        <Badge variant="outline" className="text-[11px]">
                          {task.status.replaceAll("_", " ")}
                        </Badge>
                      )}
                      {task.externalIssueLink && (
                        <a
                          href={task.externalIssueLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-muted"
                          title="Open External Issue"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Link
                        href={`/${workspaceId}/projects/${group.project.id}`}
                        className="text-xs text-primary font-medium hover:underline ml-1"
                      >
                        Go to Project
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
