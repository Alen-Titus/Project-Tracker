"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Server,
  Cloud,
  Database,
  Laptop,
  KeyRound,
  Box,
  Copy,
  Check,
  ShieldAlert,
  Calendar,
  Terminal,
  Cpu,
  Info,
} from "lucide-react"
import { AllocateResourceDialog, ResourceData } from "@/components/allocate-resource-dialog"

export function MemberResources({
  workspaceId,
  memberId,
  memberUserId,
  memberName,
  canView,
  isAdmin,
  isSelf,
  resources = [],
}: {
  workspaceId: string
  memberId: string
  memberUserId: string
  memberName: string
  canView: boolean
  isAdmin: boolean
  isSelf: boolean
  resources: ResourceData[]
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(id)
    setTimeout(() => {
      setCopiedField(null)
    }, 2000)
  }

  // If user cannot view this member's resources
  if (!canView) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="py-8 flex flex-col items-center justify-center text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <p className="font-semibold text-sm">Resource Allocations are Private</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            VMs, hardware, and infrastructure allocated to {memberName} are only visible to the member and workspace administrators.
          </p>
        </CardContent>
      </Card>
    )
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

  const getTypeLabel = (type: string) => {
    switch (type.toUpperCase()) {
      case "VM":
        return "Virtual Machine"
      case "CLOUD_INSTANCE":
        return "Cloud Instance"
      case "DATABASE":
        return "Database"
      case "HARDWARE":
        return "Hardware"
      case "LICENSE":
        return "Software License"
      default:
        return "Resource"
    }
  }

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase()
    if (s === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
        </span>
      )
    }
    if (s === "PROVISIONING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Provisioning
        </span>
      )
    }
    if (s === "INACTIVE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Inactive
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" /> {status}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Allocated Resources
            <Badge variant="secondary" className="text-xs font-semibold">
              {resources.length}
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isSelf
              ? "Virtual machines, cloud accounts, and hardware provisioned for your use."
              : `Virtual machines, cloud accounts, and hardware allocated to ${memberName}.`}
          </p>
        </div>

        {isAdmin && (
          <AllocateResourceDialog
            workspaceId={workspaceId}
            userId={memberUserId}
          />
        )}
      </div>

      {resources.length === 0 ? (
        <Card className="border-dashed bg-card/40">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">No resources allocated yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                {isAdmin
                  ? `Click "Allocate Resource" above to assign a VM, cloud environment, hardware, or license to ${memberName}.`
                  : "You currently have no infrastructure or hardware resources allocated."}
              </p>
            </div>
            {isAdmin && (
              <AllocateResourceDialog
                workspaceId={workspaceId}
                userId={memberUserId}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((res) => (
            <Card
              key={res.id}
              className="shadow-xs border border-border/80 hover:border-primary/40 transition-colors flex flex-col justify-between"
            >
              <CardHeader className="pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getTypeIcon(res.type)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold leading-tight">
                        {res.name}
                      </CardTitle>
                      <span className="text-[11px] text-muted-foreground">
                        {getTypeLabel(res.type)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(res.status)}</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-xs pt-0 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  {/* Specs */}
                  {res.specs && (
                    <div className="flex items-center gap-2 text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-md font-mono text-[11px]">
                      <Cpu className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{res.specs}</span>
                    </div>
                  )}

                  {/* Identifier / IP Address */}
                  {res.identifier && (
                    <div className="flex items-center justify-between gap-2 bg-muted/50 px-2.5 py-1.5 rounded-md font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Terminal className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Host/IP:</span>
                        <span className="font-semibold text-foreground truncate">
                          {res.identifier}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(res.identifier!, `id-${res.id}`)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0 p-0.5 rounded"
                        title="Copy Host / IP"
                      >
                        {copiedField === `id-${res.id}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Access Info / Connection command */}
                  {res.accessInfo && (
                    <div className="flex items-center justify-between gap-2 bg-muted/50 px-2.5 py-1.5 rounded-md font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-muted-foreground">Access:</span>
                        <span className="text-foreground/90 truncate">{res.accessInfo}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(res.accessInfo!, `access-${res.id}`)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0 p-0.5 rounded"
                        title="Copy Access Details"
                      >
                        {copiedField === `access-${res.id}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Notes */}
                  {res.notes && (
                    <div className="flex items-start gap-1.5 text-muted-foreground text-[11px] pt-1">
                      <Info className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/70" />
                      <span className="line-clamp-2">{res.notes}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {res.expiresAt
                        ? `Expires: ${new Date(res.expiresAt).toLocaleDateString()}`
                        : "No expiration"}
                    </span>
                  </div>

                  {isAdmin && (
                    <AllocateResourceDialog
                      workspaceId={workspaceId}
                      userId={memberUserId}
                      resourceToEdit={res}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
