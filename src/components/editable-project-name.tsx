"use client"

import React, { useState, useTransition } from "react"
import { updateProjectName } from "@/actions/projects"
import { Input } from "@/components/ui/input"

export function EditableProjectName({ 
  workspaceId, 
  projectId, 
  initialName 
}: { 
  workspaceId: string
  projectId: string
  initialName: string
}) {
  const [name, setName] = useState(initialName)
  const [isPending, startTransition] = useTransition()

  const handleBlur = () => {
    if (name.trim() === "") {
      setName(initialName)
      return
    }
    if (name !== initialName) {
      startTransition(async () => {
        await updateProjectName(workspaceId, projectId, name)
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur()
    }
  }

  return (
    <Input
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={isPending}
      className="text-2xl font-bold tracking-tight h-auto p-1 -ml-1 border-transparent hover:border-input focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-input bg-transparent shadow-none"
    />
  )
}
