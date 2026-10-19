"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Calendar, Building2, Eye, FolderKanban } from "lucide-react"
import { cn } from "@/lib/utils"

export type TaskItem = {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | Date | null
  projectId: string
  workspaceId: string
  assigneeId: string | null
  reviewerId: string | null
  project: {
    id: string
    name: string
  }
  workspace: {
    id: string
    name: string
  }
}

export function DashboardMyTasks({
  tasks,
  currentWorkspaceId,
  currentWorkspaceName,
  currentUserId,
}: {
  tasks: TaskItem[]
  currentWorkspaceId: string
  currentWorkspaceName: string
  currentUserId: string
}) {
  const [scope, setScope] = useState<"all" | "current">("all")
  const [roleFilter, setRoleFilter] = useState<"all" | "assignee" | "reviewer">("all")

  const currentWorkspaceTasks = tasks.filter((t) => t.workspaceId === currentWorkspaceId)
  const scopedTasks = scope === "all" ? tasks : currentWorkspaceTasks

  const filteredTasks = scopedTasks.filter((t) => {
    if (roleFilter === "assignee") return t.assigneeId === currentUserId
    if (roleFilter === "reviewer") return t.reviewerId === currentUserId
    return true
  })

  const assigneeCount = scopedTasks.filter((t) => t.assigneeId === currentUserId).length
  const reviewerCount = scopedTasks.filter((t) => t.reviewerId === currentUserId).length

  return (
    <Card className="shadow-xs border-primary/20">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 bg-primary/5 rounded-t-xl gap-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Active Tasks
          </CardTitle>
          <CardDescription className="text-xs">
            {scope === "all"
              ? "Tasks assigned to or reviewed by you across all your workspaces"
              : `Tasks in ${currentWorkspaceName}`}
          </CardDescription>
        </div>

        {/* Scope Toggle: All Workspaces vs Current Workspace */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border text-xs">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                scope === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Workspaces ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setScope("current")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                scope === "current"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              This Workspace ({currentWorkspaceTasks.length})
            </button>
          </div>
        </div>
      </CardHeader>

      {/* Role Sub-Filter: All, Assignee, Reviewer */}
      {scopedTasks.length > 0 && reviewerCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20 text-xs">
          <span className="text-muted-foreground text-[11px]">Role:</span>
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={cn(
              "px-2 py-0.5 rounded transition-colors cursor-pointer text-[11px]",
              roleFilter === "all"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({scopedTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("assignee")}
            className={cn(
              "px-2 py-0.5 rounded transition-colors cursor-pointer text-[11px]",
              roleFilter === "assignee"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Assignee ({assigneeCount})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("reviewer")}
            className={cn(
              "px-2 py-0.5 rounded transition-colors cursor-pointer text-[11px]",
              roleFilter === "reviewer"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Reviewer ({reviewerCount})
          </button>
        </div>
      )}

      <CardContent className="p-0">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">You&apos;re all caught up!</p>
            <p className="text-xs mt-1">
              {scope === "all"
                ? "No active tasks found across any of your workspaces."
                : `No active tasks found in ${currentWorkspaceName}.`}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredTasks.map((task) => {
              const isOverdue =
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                task.status !== "DONE"
              const isReviewerOnly =
                task.reviewerId === currentUserId && task.assigneeId !== currentUserId

              return (
                <Link
                  key={task.id}
                  href={`/${task.workspaceId}/projects/${task.projectId}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-3 group"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      {task.priority === "URGENT" && (
                        <Badge
                          variant="destructive"
                          className="text-[9px] px-1 h-4 leading-none"
                        >
                          URGENT
                        </Badge>
                      )}
                      {task.priority === "HIGH" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 h-4 leading-none border-orange-500/50 text-orange-600 bg-orange-500/10"
                        >
                          HIGH
                        </Badge>
                      )}
                      {isReviewerOnly && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 h-4 leading-none border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 flex items-center gap-1"
                        >
                          <Eye className="h-2.5 w-2.5" /> Reviewer
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {/* Workspace Badge (especially useful in All Workspaces view) */}
                      <span className="flex items-center gap-1 font-medium text-foreground/80 bg-muted px-1.5 py-0.5 rounded text-[10px] border">
                        <Building2 className="h-3 w-3 text-indigo-500" />
                        {task.workspace.name}
                      </span>

                      {/* Project Link */}
                      <span className="flex items-center gap-1 text-[11px]">
                        <FolderKanban className="h-3 w-3 text-muted-foreground/60" />
                        {task.project.name}
                      </span>

                      {/* Due Date */}
                      {task.dueDate && (
                        <>
                          <span className="opacity-40">•</span>
                          <span
                            className={cn(
                              "flex items-center gap-1 text-[11px]",
                              isOverdue
                                ? "text-destructive font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            <Calendar className="h-3 w-3" />
                            {isOverdue ? "Overdue: " : "Due "}
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 self-start sm:self-center">
                    {task.status === "TO_BE_PLANNED" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] w-fit border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10"
                      >
                        To Be Planned
                      </Badge>
                    )}
                    {task.status === "TODO" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] w-fit border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/10"
                      >
                        To Do
                      </Badge>
                    )}
                    {task.status === "IN_PROGRESS" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] w-fit border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                      >
                        In Progress
                      </Badge>
                    )}
                    {task.status === "IN_PROGRESS_DELAYED" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] w-fit border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                      >
                        In Progress - Delayed
                      </Badge>
                    )}
                    {task.status === "DONE" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] w-fit border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      >
                        Done
                      </Badge>
                    )}
                    {!["TO_BE_PLANNED", "TODO", "IN_PROGRESS", "IN_PROGRESS_DELAYED", "DONE"].includes(
                      task.status
                    ) && (
                      <Badge variant="outline" className="text-[10px] w-fit">
                        {task.status.replaceAll("_", " ")}
                      </Badge>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
