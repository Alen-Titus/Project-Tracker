"use client"

import React, { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { updateTaskStatus, deleteTask } from "@/actions/tasks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Trash2, Calendar, Eye } from "lucide-react"
import { TaskDetailPanel } from "@/components/task-detail-panel"
import { cn } from "@/lib/utils"

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: Date | null
  externalIssueLink: string | null
  assignee: { name: string | null; id?: string } | null
  reviewer?: { name: string | null; id?: string } | null
}

const columns = [
  { id: "TO_BE_PLANNED", title: "To Be Planned", color: "border-purple-500/20 bg-purple-500/5 text-purple-700 dark:text-purple-300", badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  { id: "TODO", title: "To Do", color: "border-slate-500/20 bg-slate-500/5 text-slate-700 dark:text-slate-300", badgeColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30" },
  { id: "IN_PROGRESS", title: "In Progress", color: "border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300", badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  { id: "IN_PROGRESS_DELAYED", title: "In Progress - Delayed", color: "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300", badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { id: "DONE", title: "Done", color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300", badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
]

export function KanbanBoard({ 
  workspaceId, 
  tasks, 
  projectId,
  members,
  currentUser
}: { 
  workspaceId: string, 
  tasks: Task[]; 
  projectId: string;
  members: { id: string, name: string }[];
  currentUser: { id: string }
}) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [mobileColumn, setMobileColumn] = useState<string>("TODO")

  // Filters
  const [filterMyTasks, setFilterMyTasks] = useState(false)
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null)
  const [filterReviewer, setFilterReviewer] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setLocalTasks(tasks)
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id)
      if (updated) setSelectedTask(updated)
    }
  }, [tasks])

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )
    await updateTaskStatus(workspaceId, taskId, newStatus, projectId)
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const newStatus = destination.droppableId
    await handleStatusChange(draggableId, newStatus)
  }

  const handleDeleteTask = async (taskId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete task "${title}"?`)) {
      setLocalTasks((prev) => prev.filter((t) => t.id !== taskId))
      await deleteTask(workspaceId, taskId, projectId)
      if (selectedTask?.id === taskId) setSelectedTask(null)
    }
  }

  // Pre-hydration fallback view
  if (!isMounted) {
    return (
      <div className="flex gap-4 overflow-x-auto h-full pb-4 items-stretch">
        {columns.map((col) => (
          <div key={col.id} className="w-80 min-w-[280px] shrink-0 flex flex-col bg-muted/40 rounded-xl p-4 h-full border">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground">{col.title}</h3>
            <div className="flex-1 space-y-3 min-h-[150px]">
              {localTasks
                .filter((t) => t.status === col.id)
                .map((task) => (
                  <Card key={task.id} className="bg-card shadow-xs">
                    <CardHeader className="p-3.5 pb-2">
                      <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const filteredTasks = localTasks.filter((t) => {
    if (filterMyTasks && t.assignee?.id !== currentUser.id && t.reviewer?.id !== currentUser.id) return false
    if (filterAssignee && t.assignee?.id !== filterAssignee) return false
    if (filterReviewer && t.reviewer?.id !== filterReviewer) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <button
          onClick={() => setFilterMyTasks(!filterMyTasks)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
            filterMyTasks ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
          }`}
        >
          My Involvements
        </button>
        
        <select
          value={filterAssignee || ""}
          onChange={(e) => setFilterAssignee(e.target.value || null)}
          className="text-xs px-2.5 py-1.5 rounded-full border bg-card hover:bg-muted outline-none cursor-pointer"
        >
          <option value="">Any Assignee</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <select
          value={filterReviewer || ""}
          onChange={(e) => setFilterReviewer(e.target.value || null)}
          className="text-xs px-2.5 py-1.5 rounded-full border bg-card hover:bg-muted outline-none cursor-pointer"
        >
          <option value="">Any Reviewer</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <select
          value={filterPriority || ""}
          onChange={(e) => setFilterPriority(e.target.value || null)}
          className="text-xs px-2.5 py-1.5 rounded-full border bg-card hover:bg-muted outline-none cursor-pointer"
        >
          <option value="">Any Priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        {(filterMyTasks || filterAssignee || filterReviewer || filterPriority) && (
          <button
            onClick={() => {
              setFilterMyTasks(false)
              setFilterAssignee(null)
              setFilterReviewer(null)
              setFilterPriority(null)
            }}
            className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Mobile Column Tab Switcher */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {columns.map(col => {
          const count = filteredTasks.filter(t => t.status === col.id).length
          const isActive = mobileColumn === col.id
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobileColumn(col.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border cursor-pointer",
                isActive 
                  ? "bg-primary text-primary-foreground border-primary shadow-xs" 
                  : "bg-card text-muted-foreground hover:text-foreground border-border"
              )}
            >
              <span>{col.title}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto h-full pb-4 items-stretch">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id)

              return (
                <div
                  key={col.id}
                  className={cn(
                    "w-full md:w-80 md:min-w-[280px] shrink-0 flex-col bg-muted/30 rounded-xl p-4 h-full border overflow-hidden",
                    mobileColumn === col.id ? "flex" : "hidden md:flex"
                  )}
                >
                  <div className="flex items-center justify-between mb-3.5 px-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{col.title}</span>
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        {colTasks.length}
                      </Badge>
                    </div>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 space-y-3 min-h-[150px] overflow-y-auto pr-1 transition-colors rounded-lg p-1 ${
                          snapshot.isDraggingOver ? "bg-accent/40" : ""
                        }`}
                      >
                        {colTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedTask(task)}
                                className={`bg-card shadow-xs transition-all border select-none ${
                                  snapshot.isDragging
                                    ? "ring-2 ring-primary shadow-lg scale-102 cursor-grabbing"
                                    : "hover:border-primary/50 cursor-pointer"
                                }`}
                              >
                                <CardHeader className="p-3.5 pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
                                  <CardTitle className="text-sm font-medium leading-snug">
                                    {task.title}
                                  </CardTitle>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteTask(task.id, task.title, e)}
                                    className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 rounded shrink-0 hover:bg-destructive/10"
                                    title="Delete task"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </CardHeader>
                                <CardContent className="p-3.5 pt-0 text-xs text-muted-foreground space-y-2.5">
                                  <div className="flex items-center flex-wrap gap-2 text-[10px]">
                                    {task.priority === "URGENT" && (
                                      <Badge variant="destructive" className="px-1.5 text-[9px] h-4 leading-none py-0 shadow-sm shadow-red-500/20">URGENT</Badge>
                                    )}
                                    {task.priority === "HIGH" && (
                                      <Badge variant="outline" className="px-1.5 text-[9px] h-4 leading-none py-0 border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/10 shadow-sm shadow-orange-500/10">HIGH</Badge>
                                    )}
                                    {task.priority === "MEDIUM" && (
                                      <Badge variant="outline" className="px-1.5 text-[9px] h-4 leading-none py-0 border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10">MEDIUM</Badge>
                                    )}
                                    {task.priority === "LOW" && (
                                      <Badge variant="outline" className="px-1.5 text-[9px] h-4 leading-none py-0 border-slate-500/50 text-slate-600 dark:text-slate-400 bg-slate-500/10">LOW</Badge>
                                    )}
                                    {task.dueDate && (() => {
                                      const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "DONE"
                                      return (
                                        <span className={cn(
                                          "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]",
                                          isOverdue
                                            ? "bg-destructive/10 text-destructive border-destructive/30 font-medium"
                                            : "text-muted-foreground bg-muted border-border/50"
                                        )}>
                                          <Calendar className={cn("h-3 w-3", isOverdue ? "text-destructive" : "text-indigo-500/70")} />
                                          <span>
                                            {isOverdue ? "Overdue: " : ""}
                                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                          </span>
                                          {(new Date(task.dueDate).getHours() !== 0 || new Date(task.dueDate).getMinutes() !== 0) && (
                                            <span className="text-[9px] opacity-80 font-mono">
                                              {new Date(task.dueDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                          )}
                                        </span>
                                      )
                                    })()}
                                  </div>
                                  {task.description && (
                                    <p className="line-clamp-2 text-muted-foreground/90">
                                      {task.description}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                      {task.assignee ? (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 max-w-[100px] truncate" title={`Assignee: ${task.assignee.name || "Unknown"}`}>
                                          {task.assignee.name || "Unknown"}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground/50 italic text-[11px]">
                                          Unassigned
                                        </span>
                                      )}
                                      {task.reviewer && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 flex items-center gap-1 max-w-[110px] truncate" title={`Reviewer: ${task.reviewer.name || "Unknown"}`}>
                                          <Eye className="h-2.5 w-2.5 shrink-0" />
                                          <span className="truncate">{task.reviewer.name || "Unknown"}</span>
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      {task.externalIssueLink && (
                                        <a
                                          href={task.externalIssueLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[11px] p-0.5 rounded"
                                          title="Open issue link"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          <span>Issue</span>
                                        </a>
                                      )}

                                      <div className="relative group/status">
                                        <select
                                          value={task.status}
                                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                          className="text-[10px] bg-secondary/80 hover:bg-secondary text-foreground rounded px-1.5 py-0.5 border border-border/80 cursor-pointer outline-none"
                                          title="Change status"
                                        >
                                          <option value="TO_BE_PLANNED">To Be Planned</option>
                                          <option value="TODO">To Do</option>
                                          <option value="IN_PROGRESS">In Progress</option>
                                          <option value="IN_PROGRESS_DELAYED">In Progress - Delayed</option>
                                          <option value="DONE">Done</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>

      <TaskDetailPanel
        workspaceId={workspaceId}
        projectId={projectId}
        taskId={selectedTask?.id || null}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        taskData={selectedTask}
        members={members}
        currentUser={currentUser}
        onUpdateTask={(updated) => {
          setLocalTasks(prev => prev.map(t => {
            if (t.id !== updated.id) return t
            const next = { ...t, ...updated }
            if (updated.assigneeId !== undefined) {
              if (!updated.assigneeId || updated.assigneeId === "unassigned") {
                next.assignee = null
              } else {
                const member = members.find(m => m.id === updated.assigneeId)
                next.assignee = member ? { id: member.id, name: member.name } : t.assignee
              }
            }
            if (updated.reviewerId !== undefined) {
              if (!updated.reviewerId || updated.reviewerId === "unassigned") {
                next.reviewer = null
              } else {
                const member = members.find(m => m.id === updated.reviewerId)
                next.reviewer = member ? { id: member.id, name: member.name } : t.reviewer
              }
            }
            return next
          }))
          setSelectedTask(prev => {
            if (!prev || prev.id !== updated.id) return prev
            const next = { ...prev, ...updated }
            if (updated.assigneeId !== undefined) {
              if (!updated.assigneeId || updated.assigneeId === "unassigned") {
                next.assignee = null
              } else {
                const member = members.find(m => m.id === updated.assigneeId)
                next.assignee = member ? { id: member.id, name: member.name } : prev.assignee
              }
            }
            if (updated.reviewerId !== undefined) {
              if (!updated.reviewerId || updated.reviewerId === "unassigned") {
                next.reviewer = null
              } else {
                const member = members.find(m => m.id === updated.reviewerId)
                next.reviewer = member ? { id: member.id, name: member.name } : prev.reviewer
              }
            }
            return next
          })
        }}
      />
    </div>
  )
}
