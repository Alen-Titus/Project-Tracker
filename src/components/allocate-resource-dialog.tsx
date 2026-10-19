"use client"

import React, { useState, useTransition } from "react"
import { allocateResource, updateResource, deleteResource } from "@/actions/resources"
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
import {
  Server,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Laptop,
  Cloud,
  Database,
  KeyRound,
  Box,
} from "lucide-react"
import { useRouter } from "next/navigation"

export type ResourceData = {
  id: string
  name: string
  type: string
  identifier: string | null
  specs: string | null
  status: string
  accessInfo: string | null
  notes: string | null
  expiresAt: string | Date | null
  userId: string
  user?: {
    id: string
    name: string | null
    email: string | null
  }
}

export type MemberOption = {
  id: string
  userId: string
  role?: string | null
  user: {
    name: string | null
    email: string | null
  }
}

export function AllocateResourceDialog({
  workspaceId,
  userId,
  members = [],
  resourceToEdit,
  trigger,
}: {
  workspaceId: string
  userId?: string
  members?: MemberOption[]
  resourceToEdit?: ResourceData
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const isEditing = !!resourceToEdit
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form states
  const [targetUserId, setTargetUserId] = useState(
    resourceToEdit?.userId || userId || (members[0]?.userId ?? "")
  )
  const [name, setName] = useState(resourceToEdit?.name || "")
  const [type, setType] = useState(resourceToEdit?.type || "VM")
  const [identifier, setIdentifier] = useState(resourceToEdit?.identifier || "")
  const [specs, setSpecs] = useState(resourceToEdit?.specs || "")
  const [status, setStatus] = useState(resourceToEdit?.status || "ACTIVE")
  const [accessInfo, setAccessInfo] = useState(resourceToEdit?.accessInfo || "")
  const [notes, setNotes] = useState(resourceToEdit?.notes || "")
  const [expiresAt, setExpiresAt] = useState(
    resourceToEdit?.expiresAt
      ? new Date(resourceToEdit.expiresAt).toISOString().split("T")[0]
      : ""
  )

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTargetUserId(
        resourceToEdit?.userId || userId || (members[0]?.userId ?? "")
      )
      setName(resourceToEdit?.name || "")
      setType(resourceToEdit?.type || "VM")
      setIdentifier(resourceToEdit?.identifier || "")
      setSpecs(resourceToEdit?.specs || "")
      setStatus(resourceToEdit?.status || "ACTIVE")
      setAccessInfo(resourceToEdit?.accessInfo || "")
      setNotes(resourceToEdit?.notes || "")
      setExpiresAt(
        resourceToEdit?.expiresAt
          ? new Date(resourceToEdit.expiresAt).toISOString().split("T")[0]
          : ""
      )
      setErrorMessage(null)
    }
    setOpen(nextOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!name.trim()) {
      setErrorMessage("Resource name is required.")
      return
    }

    if (!targetUserId) {
      setErrorMessage("Please select a team member to allocate this resource to.")
      return
    }

    startTransition(async () => {
      try {
        if (isEditing && resourceToEdit) {
          await updateResource(workspaceId, resourceToEdit.id, {
            name: name.trim(),
            type,
            identifier: identifier.trim() || null,
            specs: specs.trim() || null,
            status,
            accessInfo: accessInfo.trim() || null,
            notes: notes.trim() || null,
            expiresAt: expiresAt ? expiresAt : null,
            userId: targetUserId,
          })
        } else {
          await allocateResource(workspaceId, {
            userId: targetUserId,
            name: name.trim(),
            type,
            identifier: identifier.trim() || undefined,
            specs: specs.trim() || undefined,
            status,
            accessInfo: accessInfo.trim() || undefined,
            notes: notes.trim() || undefined,
            expiresAt: expiresAt ? expiresAt : undefined,
          })
        }

        router.refresh()
        setOpen(false)
      } catch (err: any) {
        console.error("Resource allocation error:", err)
        setErrorMessage(err.message || "Failed to save resource allocation.")
      }
    })
  }

  const handleDelete = () => {
    if (!resourceToEdit) return
    if (confirm(`Are you sure you want to deallocate "${resourceToEdit.name}"?`)) {
      startTransition(async () => {
        try {
          await deleteResource(workspaceId, resourceToEdit.id)
          router.refresh()
          setOpen(false)
        } catch (err: any) {
          setErrorMessage(err.message || "Failed to delete resource.")
        }
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className={
          isEditing
            ? buttonVariants({ variant: "outline", size: "sm" }) + " h-8 gap-1.5 text-xs cursor-pointer"
            : buttonVariants({ size: "sm" }) + " gap-1.5 cursor-pointer"
        }
      >
        {isEditing ? (
          <>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-1" /> Allocate Resource
          </>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Allocated Resource" : "Allocate New Resource"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Member Selection if multiple options */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="resource-member">Assign To Team Member</Label>
              <select
                id="resource-member"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                disabled={isPending || (!!userId && !isEditing)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name || m.user.email} {m.role ? `(${m.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Resource Name */}
          <div className="space-y-1.5">
            <Label htmlFor="resource-name">Resource Name *</Label>
            <Input
              id="resource-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ubuntu 22.04 LTS Dev VM, AWS Dev Sandbox"
              disabled={isPending}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Resource Type */}
            <div className="space-y-1.5">
              <Label htmlFor="resource-type">Resource Type</Label>
              <select
                id="resource-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="VM">Virtual Machine (VM)</option>
                <option value="CLOUD_INSTANCE">Cloud Instance / Cloud Account</option>
                <option value="DATABASE">Dedicated Database</option>
                <option value="HARDWARE">Hardware / Laptop / Workstation</option>
                <option value="LICENSE">Software License / SaaS Account</option>
                <option value="OTHER">Other Resource</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="resource-status">Allocation Status</Label>
              <select
                id="resource-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ACTIVE">Active (In Use)</option>
                <option value="PROVISIONING">Provisioning (In Setup)</option>
                <option value="INACTIVE">Inactive (Suspended)</option>
                <option value="DECOMMISSIONED">Decommissioned / Released</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Identifier / IP Address */}
            <div className="space-y-1.5">
              <Label htmlFor="resource-id">IP / Hostname / Identifier</Label>
              <Input
                id="resource-id"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 192.168.1.105, aws-dev-01, i-0a8..."
                disabled={isPending}
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <Label htmlFor="resource-expiry">Expiry Date (Optional)</Label>
              <Input
                id="resource-expiry"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Specs */}
          <div className="space-y-1.5">
            <Label htmlFor="resource-specs">Specifications / Capacity</Label>
            <Input
              id="resource-specs"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="e.g. 8 vCPU, 32 GB RAM, 250 GB NVMe SSD"
              disabled={isPending}
            />
          </div>

          {/* Access Info */}
          <div className="space-y-1.5">
            <Label htmlFor="resource-access">Access Info / Connection Endpoint</Label>
            <Input
              id="resource-access"
              value={accessInfo}
              onChange={(e) => setAccessInfo(e.target.value)}
              placeholder="e.g. ssh ubuntu@192.168.1.105 -p 2222, https://aws.amazon.com/..."
              disabled={isPending}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="resource-notes">Notes / Usage Purpose</Label>
            <Textarea
              id="resource-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Allocated for QA testing automation suite and staging benchmarks."
              rows={2}
              disabled={isPending}
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-3 flex items-center justify-between border-t gap-2">
            {isEditing ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4 mr-1.5" /> Deallocate
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Allocate Resource"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
