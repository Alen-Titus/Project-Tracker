"use client"

import React, { useState, useEffect, useTransition } from "react"
import { updateTaskDetails, updateTaskStatus, getTaskActivities } from "@/actions/tasks"
import { getComments, addComment, deleteComment } from "@/actions/comments"
import { generateTaskDescription } from "@/actions/ai"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExternalLink, Calendar, MessageSquare, Loader2, Trash2, Sparkles, X, Check, History } from "lucide-react"

function formatDateTimeLocal(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = new Date(date)
  if (isNaN(d.getTime())) return ""
  const offset = d.getTimezoneOffset() * 60000
  const localDate = new Date(d.getTime() - offset)
  return localDate.toISOString().slice(0, 16)
}

type TaskDetailPanelProps = {
  workspaceId: string
  projectId: string
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  taskData: {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: Date | null
    assignee: { name: string | null; id?: string } | null
    reviewer?: { name: string | null; id?: string } | null
    externalIssueLink: string | null
  } | null
  members: { id: string; name: string }[]
  currentUser: { id: string }
  onUpdateTask?: (updated: any) => void
}

export function TaskDetailPanel({
  workspaceId,
  projectId,
  taskId,
  isOpen,
  onClose,
  taskData,
  members,
  currentUser,
  onUpdateTask
}: TaskDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  
  // Local state for optimistic updates
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("TODO")
  const [priority, setPriority] = useState("MEDIUM")
  const [assigneeId, setAssigneeId] = useState("unassigned")
  const [reviewerId, setReviewerId] = useState("unassigned")
  const [dueDate, setDueDate] = useState("")
  const [externalIssueLink, setExternalIssueLink] = useState("")
  
  const [comments, setComments] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [timelineTab, setTimelineTab] = useState<"all" | "comments">("all")
  const [newComment, setNewComment] = useState("")
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)

  // Initialize state when task changes or panel opens
  useEffect(() => {
    if (taskData && isOpen) {
      setTitle(taskData.title)
      setDescription(taskData.description || "")
      setStatus(taskData.status)
      setPriority(taskData.priority || "MEDIUM")
      setAssigneeId(taskData.assignee?.id || "unassigned")
      setReviewerId(taskData.reviewer?.id || "unassigned")
      setDueDate(formatDateTimeLocal(taskData.dueDate))
      setExternalIssueLink(taskData.externalIssueLink || "")
      
      // Fetch timeline (comments + audit activities)
      loadTimeline(taskData.id)
    }
  }, [taskData?.id, isOpen])

  const loadTimeline = async (id: string) => {
    setIsCommentsLoading(true)
    try {
      const [commentsData, activitiesData] = await Promise.all([
        getComments(workspaceId, id),
        getTaskActivities(workspaceId, id)
      ])
      setComments(commentsData || [])
      setActivities(activitiesData || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsCommentsLoading(false)
    }
  }

  const handleSave = (overrides?: {
    title?: string
    description?: string
    status?: string
    priority?: string
    assigneeId?: string
    reviewerId?: string
    dueDate?: string
    externalIssueLink?: string
  }) => {
    if (!taskId) return

    const newTitle = overrides?.title !== undefined ? overrides.title : title
    const newDescription = overrides?.description !== undefined ? overrides.description : description
    const newStatus = overrides?.status !== undefined ? overrides.status : status
    const newPriority = overrides?.priority !== undefined ? overrides.priority : priority
    const newAssigneeId = overrides?.assigneeId !== undefined ? overrides.assigneeId : assigneeId
    const newReviewerId = overrides?.reviewerId !== undefined ? overrides.reviewerId : reviewerId
    const newDueDateStr = overrides?.dueDate !== undefined ? overrides.dueDate : dueDate
    const newExternalLink = overrides?.externalIssueLink !== undefined ? overrides.externalIssueLink : externalIssueLink

    const parsedDueDate = newDueDateStr && newDueDateStr.trim() ? new Date(newDueDateStr) : null

    // Optimistically update parent Kanban state
    if (onUpdateTask) {
      onUpdateTask({
        id: taskId,
        title: newTitle,
        description: newDescription,
        status: newStatus,
        priority: newPriority,
        assigneeId: newAssigneeId,
        reviewerId: newReviewerId,
        dueDate: parsedDueDate,
        externalIssueLink: newExternalLink
      })
    }

    startTransition(async () => {
      try {
        await updateTaskDetails(workspaceId, taskId, {
          title: newTitle,
          description: newDescription,
          status: newStatus,
          priority: newPriority,
          dueDate: parsedDueDate,
          assigneeId: newAssigneeId,
          reviewerId: newReviewerId,
          externalIssueLink: newExternalLink
        }, projectId)
        
        if (newStatus !== taskData?.status) {
          await updateTaskStatus(workspaceId, taskId, newStatus, projectId)
        }
        await loadTimeline(taskId)
      } catch (err) {
        console.error("Failed to update task:", err)
      }
    })
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskId || !newComment.trim()) return
    
    startTransition(async () => {
      await addComment(workspaceId, taskId, newComment, projectId)
      setNewComment("")
      await loadTimeline(taskId)
    })
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!taskId) return
    startTransition(async () => {
      await deleteComment(workspaceId, commentId, projectId)
      await loadTimeline(taskId)
    })
  }

  const renderStatusBadge = (s: string) => {
    switch (s) {
      case "TO_BE_PLANNED":
        return <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-medium">To Be Planned</Badge>
      case "TODO":
        return <Badge variant="outline" className="text-[10px] border-slate-500/50 text-slate-600 dark:text-slate-400 bg-slate-500/10 font-medium">To Do</Badge>
      case "IN_PROGRESS":
        return <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-medium">In Progress</Badge>
      case "IN_PROGRESS_DELAYED":
        return <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-medium">In Progress - Delayed</Badge>
      case "DONE":
        return <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium">Done</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{s.replace("_", " ")}</Badge>
    }
  }

  if (!taskData) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto bg-background p-0 flex flex-col gap-0 border-l border-border/40 shadow-2xl">
        <div className="flex-1 overflow-y-auto">
          {/* Header Area */}
          <div className="p-6 border-b bg-card/50">
            <SheetHeader className="mb-4">
              <SheetTitle className="sr-only">Task Details</SheetTitle>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {renderStatusBadge(status)}
                {priority === "URGENT" && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
                {priority === "HIGH" && <Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-600 bg-orange-500/10">High</Badge>}
                <div className="ml-auto flex items-center gap-2">
                  {isPending ? (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-500" /> Saving...
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-500" /> Saved
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">ID: {taskData.id.slice(-6).toUpperCase()}</span>
                </div>
              </div>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleSave({ title })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur()
                }}
                className="text-lg font-bold border-transparent px-2 py-1 -ml-2 hover:border-border focus-visible:border-border shadow-none bg-transparent"
              />
            </SheetHeader>
          </div>

          {/* Body Area */}
          <div className="p-6 space-y-8">
            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  value={status}
                  onChange={(e) => { 
                    const val = e.target.value
                    setStatus(val)
                    handleSave({ status: val })
                  }}
                  disabled={isPending}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
                >
                  <option value="TO_BE_PLANNED">To Be Planned</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_PROGRESS_DELAYED">In Progress - Delayed</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <select
                  value={priority}
                  onChange={(e) => { 
                    const val = e.target.value
                    setPriority(val)
                    handleSave({ priority: val })
                  }}
                  disabled={isPending}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Assignee</Label>
                <select
                  value={assigneeId}
                  onChange={(e) => { 
                    const val = e.target.value
                    setAssigneeId(val)
                    handleSave({ assigneeId: val })
                  }}
                  disabled={isPending}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
                >
                  <option value="unassigned">Unassigned</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Reviewer</Label>
                <select
                  value={reviewerId}
                  onChange={(e) => { 
                    const val = e.target.value
                    setReviewerId(val)
                    handleSave({ reviewerId: val })
                  }}
                  disabled={isPending}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
                >
                  <option value="unassigned">No Reviewer</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Due Date & Time</Label>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setDueDate("")
                        handleSave({ dueDate: "" })
                      }}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5"
                    >
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input 
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => { 
                      const val = e.target.value
                      setDueDate(val)
                      handleSave({ dueDate: val })
                    }}
                    disabled={isPending}
                    className="pl-8 text-xs h-9 bg-card cursor-pointer"
                  />
                  <Calendar className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 text-[10px] px-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                  onClick={async () => {
                    if (!title) return
                    const oldDesc = description
                    setDescription("✨ AI is thinking...")
                    try {
                      const aiDraft = await generateTaskDescription(title)
                      setDescription(aiDraft)
                      // Auto-save the new description
                      handleSave({ description: aiDraft })
                    } catch (e) {
                      console.error(e)
                      setDescription(oldDesc)
                      alert("Failed to generate AI description. Ensure API key is configured.")
                    }
                  }}
                  disabled={isPending || !title}
                >
                  <Sparkles className="h-3 w-3 mr-1" /> AI Draft
                </Button>
              </div>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleSave({ description })}
                placeholder="Add a description..."
                className="min-h-[120px] resize-none bg-transparent hover:bg-muted/30 focus:bg-background transition-colors text-sm"
              />
            </div>

            {/* External Link */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">External Issue / PR</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={externalIssueLink}
                  onChange={(e) => setExternalIssueLink(e.target.value)}
                  onBlur={() => handleSave({ externalIssueLink })}
                  placeholder="https://github.com/..."
                  className="flex-1 text-sm h-9"
                />
                {externalIssueLink && (
                  <Button size="sm" variant="outline" className="h-9 shrink-0 px-3 flex gap-1.5" onClick={() => window.open(externalIssueLink, '_blank')}>
                    <ExternalLink className="h-4 w-4" /> Open Link
                  </Button>
                )}
              </div>
            </div>

            {/* Unified Activity & Comments Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" /> Activity & Discussions
                </h3>
                <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTimelineTab("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                      timelineTab === "all" 
                        ? "bg-card text-foreground font-medium shadow-xs" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All ({comments.length + activities.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineTab("comments")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                      timelineTab === "comments" 
                        ? "bg-card text-foreground font-medium shadow-xs" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Comments ({comments.length})
                  </button>
                </div>
              </div>
              
              {/* Unified Timeline List */}
              <div className="space-y-3">
                {isCommentsLoading ? (
                  <div className="flex justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  (() => {
                    const timelineItems = [
                      ...comments.map(c => ({
                        id: c.id,
                        type: "comment" as const,
                        createdAt: c.createdAt,
                        author: c.author,
                        content: c.content
                      })),
                      ...(timelineTab === "all" ? activities.map(a => ({
                        id: a.id,
                        type: "activity" as const,
                        createdAt: a.createdAt,
                        user: a.user,
                        details: a.details,
                        action: a.action
                      })) : [])
                    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

                    if (timelineItems.length === 0) {
                      return (
                        <p className="text-xs text-muted-foreground py-2 italic text-center">
                          {timelineTab === "comments" ? "No comments yet. Start the conversation!" : "No activity or comments recorded yet."}
                        </p>
                      )
                    }

                    return timelineItems.map(item => {
                      if (item.type === "activity") {
                        return (
                          <div key={item.id} className="flex items-center gap-2.5 text-xs text-muted-foreground py-1 px-1 rounded hover:bg-muted/30 transition-colors">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/60">
                              <History className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-foreground">{item.user?.name || item.user?.email || "Team member"}</span>{" "}
                              <span>{item.details}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div key={item.id} className="flex gap-3 text-sm group">
                          <div className="h-7 w-7 rounded-full bg-secondary shrink-0 flex items-center justify-center font-semibold text-xs border">
                            {item.author?.name?.charAt(0) || "U"}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-xs">{item.author?.name || "User"}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(item.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="bg-muted/40 border rounded-md p-2.5 text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                              {item.content}
                            </div>
                            {item.author?.id === currentUser.id && (
                              <button 
                                onClick={() => handleDeleteComment(item.id)}
                                className="text-[10px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()
                )}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="mt-4 flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 shrink-0 flex items-center justify-center font-semibold text-xs border border-primary/20 text-primary">
                  {currentUser.id ? "Me" : "U"}
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment or update..."
                    className="min-h-[80px] text-xs resize-none"
                    disabled={isPending}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={!newComment.trim() || isPending} className="h-8 text-xs">
                      {isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                      Post Comment
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
