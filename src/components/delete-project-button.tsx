"use client"

import React, { useTransition } from "react"
import { deleteProject } from "@/actions/projects"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"

export function DeleteProjectButton({
  workspaceId,
  projectId,
  projectName,
}: {
  workspaceId: string
  projectId: string
  projectName: string
}) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete the project "${projectName}" and all its tasks? This action cannot be undone.`
      )
    ) {
      startTransition(async () => {
        await deleteProject(workspaceId, projectId)
      })
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      title="Delete Project"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
      )}
      Delete Project
    </Button>
  )
}
