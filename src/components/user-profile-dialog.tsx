"use client"

import React, { useState, useEffect, useTransition } from "react"
import { updateCurrentUserProfile } from "@/actions/members"
import { getMyAllocatedResources } from "@/actions/resources"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  User,
  Loader2,
  Check,
  AlertCircle,
  Server,
  Cloud,
  Database,
  Laptop,
  KeyRound,
  Box,
  Copy,
  Terminal,
  Cpu,
  Calendar,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function UserProfileDialog({
  workspaceId,
  user,
}: {
  workspaceId: string
  user: {
    name?: string | null
    email?: string | null
  }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"profile" | "resources">("profile")
  const [isPending, startTransition] = useTransition()
  
  // Local active display values
  const [currentName, setCurrentName] = useState(user.name || "")
  const [currentEmail, setCurrentEmail] = useState(user.email || "")

  // Form input values
  const [name, setName] = useState(user.name || "")
  const [email, setEmail] = useState(user.email || "")
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // My Resources state
  const [resources, setResources] = useState<any[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Sync state if user prop changes
  useEffect(() => {
    setCurrentName(user.name || "")
    setCurrentEmail(user.email || "")
  }, [user.name, user.email])

  const loadResources = async () => {
    setLoadingResources(true)
    try {
      const data = await getMyAllocatedResources(workspaceId)
      setResources(data || [])
    } catch (err) {
      console.error("Failed to load user resources:", err)
    } finally {
      setLoadingResources(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName(currentName)
      setEmail(currentEmail)
      setSavedSuccess(false)
      setErrorMessage(null)
      loadResources()
    }
    setOpen(nextOpen)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(id)
    setTimeout(() => {
      setCopiedField(null)
    }, 2000)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!name.trim()) {
      setErrorMessage("Full Name cannot be empty.")
      return
    }

    if (!email.trim()) {
      setErrorMessage("Email address cannot be empty.")
      return
    }

    startTransition(async () => {
      try {
        const res = await updateCurrentUserProfile(workspaceId, {
          name: name.trim(),
          email: email.trim()
        })

        if (res?.success) {
          if (res.name) setCurrentName(res.name)
          if (res.email) setCurrentEmail(res.email)
          setSavedSuccess(true)
          router.refresh()

          setTimeout(() => {
            setOpen(false)
            setSavedSuccess(false)
          }, 800)
        }
      } catch (err: any) {
        console.error("Profile update failed:", err)
        setErrorMessage(err.message || "Failed to update profile. Please try again.")
      }
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "VM":
        return <Server className="h-4 w-4 text-indigo-500" />
      case "CLOUD_INSTANCE":
        return <Cloud className="h-4 w-4 text-sky-500" />
      case "DATABASE":
        return <Database className="h-4 w-4 text-emerald-500" />
      case "HARDWARE":
        return <Laptop className="h-4 w-4 text-violet-500" />
      case "LICENSE":
        return <KeyRound className="h-4 w-4 text-amber-500" />
      default:
        return <Box className="h-4 w-4 text-slate-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase()
    if (s === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
        </span>
      )
    }
    if (s === "PROVISIONING") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Provisioning
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border">
        {status}
      </span>
    )
  }

  const displayName = currentName || currentEmail?.split("@")[0] || "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        type="button"
        className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs text-left hover:bg-secondary/60 transition-colors cursor-pointer group"
        title="Account Profile & Resources"
      >
        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs border border-primary/20 shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {displayName}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{currentEmail}</p>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" /> Profile & Resources
          </DialogTitle>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border text-xs mt-1">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex-1 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-center",
              activeTab === "profile"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Profile Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resources")}
            className={cn(
              "flex-1 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5",
              activeTab === "resources"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Server className="h-3.5 w-3.5" />
            My Resources
            {resources.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold">
                {resources.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "profile" ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {errorMessage && (
              <div className="flex items-center gap-2 p-2.5 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rohit Sharma"
                disabled={isPending}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Displayed on tasks, comments, and the team directory.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email Address</Label>
              <Input
                id="profile-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isPending}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Used for signing in and task assignment notifications.
              </p>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t">
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
                ) : savedSuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-emerald-500" /> Saved!
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Resources (VMs, cloud environments, hardware, licenses) allocated to your account in this workspace.
            </p>

            {loadingResources ? (
              <div className="py-8 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                <span className="text-xs">Loading allocated resources...</span>
              </div>
            ) : resources.length === 0 ? (
              <div className="py-10 text-center border border-dashed rounded-lg bg-card/40 space-y-2">
                <Server className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-xs font-semibold">No Resources Allocated</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  You currently do not have any virtual machines or dedicated hardware allocated in this workspace. Contact an admin to request resources.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {resources.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-lg border bg-card text-xs space-y-2 shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                          {getTypeIcon(res.type)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground leading-tight">
                            {res.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {res.type}
                          </p>
                        </div>
                      </div>
                      <div>{getStatusBadge(res.status)}</div>
                    </div>

                    {res.specs && (
                      <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded font-mono text-[10px] text-muted-foreground">
                        <Cpu className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{res.specs}</span>
                      </div>
                    )}

                    {res.identifier && (
                      <div className="flex items-center justify-between gap-2 bg-muted/60 px-2 py-1 rounded font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <Terminal className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Host/IP:</span>
                          <span className="font-semibold text-foreground truncate">
                            {res.identifier}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(res.identifier, `my-id-${res.id}`)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0 p-0.5 rounded"
                          title="Copy Host / IP"
                        >
                          {copiedField === `my-id-${res.id}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {res.accessInfo && (
                      <div className="flex items-center justify-between gap-2 bg-muted/60 px-2 py-1 rounded font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-muted-foreground">Access:</span>
                          <span className="text-foreground/90 truncate">{res.accessInfo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(res.accessInfo, `my-access-${res.id}`)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0 p-0.5 rounded"
                          title="Copy Access Details"
                        >
                          {copiedField === `my-access-${res.id}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {res.notes && (
                      <p className="text-[10px] text-muted-foreground italic">
                        {res.notes}
                      </p>
                    )}

                    {res.expiresAt && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t">
                        <Calendar className="h-3 w-3" />
                        <span>Expires: {new Date(res.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
