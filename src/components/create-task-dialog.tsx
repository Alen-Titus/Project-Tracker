"use client"

import React, { useState, useTransition } from "react"
import { createTask } from "@/actions/tasks"
import { generateTaskDescription } from "@/actions/ai"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2, Sparkles } from "lucide-react"

type MemberOption = {
  id: string
  name: string
}

export function CreateTaskDialog({
  workspaceId,
  projectId,
  members,
}: {
  workspaceId: string
  projectId: string
  members: MemberOption[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    // Override form data with controlled values in case they were updated synthetically
    formData.set("description", description)

    startTransition(async () => {
      await createTask(workspaceId, formData)
      setOpen(false)
      setTitle("")
      setDescription("")
      form.reset()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ size: "sm" })}>
        <Plus className="h-4 w-4 mr-1.5" /> Add Task
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <input type="hidden" name="projectId" value={projectId} />

          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-desc">Description</Label>
              <Button 
                type="button"
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
              id="task-desc"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-status">Status</Label>
              <select
                id="task-status"
                name="status"
                defaultValue="TODO"
                disabled={isPending}
                className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="TO_BE_PLANNED">To Be Planned</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_PROGRESS_DELAYED">In Progress - Delayed</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                name="priority"
                defaultValue="MEDIUM"
                disabled={isPending}
                className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <select
                id="task-assignee"
                name="assigneeId"
                defaultValue="unassigned"
                disabled={isPending}
                className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="unassigned">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-reviewer">Reviewer</Label>
              <select
                id="task-reviewer"
                name="reviewerId"
                defaultValue="unassigned"
                disabled={isPending}
                className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="unassigned">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date & Time</Label>
              <Input
                id="task-due-date"
                name="dueDate"
                type="datetime-local"
                disabled={isPending}
                className="text-sm cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-issue">External Issue Link</Label>
              <Input
                id="task-issue"
                name="externalIssueLink"
                placeholder="e.g. GitHub issue URL"
                disabled={isPending}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Task...
              </>
            ) : (
              "Create Task"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
