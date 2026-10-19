"use client"

import React, { useState, useTransition } from "react"
import { createMember } from "@/actions/members"
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
import { Plus, Loader2 } from "lucide-react"

export function CreateMemberDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      await createMember(workspaceId, formData)
      setOpen(false)
      form.reset()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="h-4 w-4 mr-2" /> Add Member
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">Name (Optional)</Label>
            <Input
              id="member-name"
              name="name"
              placeholder="e.g. Rohit Sharma"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              name="email"
              type="email"
              required
              placeholder="rohit@example.com"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-role">Role</Label>
            <Input
              id="member-role"
              name="role"
              placeholder="E.g. Senior Backend Engineer"
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Member"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
