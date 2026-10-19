"use client"

import React, { useState, useTransition } from "react"
import { updateMember, deleteMember } from "@/actions/members"
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
import { Pencil, Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

type MemberData = {
  id: string
  role: string | null
  user: {
    name: string | null
    email: string | null
  }
}

export function EditMemberDialog({ workspaceId, member }: { workspaceId: string, member: MemberData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState(member.role || "")
  const [name, setName] = useState(member.user.name || "")
  const [email, setEmail] = useState(member.user.email || "")

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setRole(member.role || "")
      setName(member.user.name || "")
      setEmail(member.user.email || "")
    }
    setOpen(nextOpen)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      await updateMember(workspaceId, formData)
      router.refresh()
      setOpen(false)
    })
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove ${member.user.name || member.user.email} from the workspace?`)) {
      startTransition(async () => {
        await deleteMember(workspaceId, member.id)
        router.refresh()
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Pencil className="h-4 w-4 mr-1.5" />
          Edit Member
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <input type="hidden" name="id" value={member.id} />
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Workspace Role</Label>
              <Input
                id="edit-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="E.g. OWNER, ADMIN, MEMBER"
                disabled={isPending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        title="Remove member"
      >
        <Trash2 className="h-4 w-4 mr-1.5" />
        Remove
      </Button>
    </div>
  )
}
