"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  User,
  ArrowRight,
  Server,
  Cloud,
  Database,
  Laptop,
  KeyRound,
  Box,
  Terminal,
  Copy,
  Check,
  Search,
  Filter,
  ShieldCheck,
  Cpu,
  Calendar,
} from "lucide-react"
import { CreateMemberDialog } from "@/components/create-member-dialog"
import { AllocateResourceDialog, ResourceData } from "@/components/allocate-resource-dialog"
import { cn } from "@/lib/utils"

export type MemberWithUser = {
  id: string
  role: string | null
  userId: string
  user: {
    id: string
    name: string | null
    email: string | null
  }
}

export function TeamDirectoryTabs({
  workspaceId,
  members,
  resources,
  isAdmin,
  currentUserId,
}: {
  workspaceId: string
  members: MemberWithUser[]
  resources: any[]
  isAdmin: boolean
  currentUserId: string
}) {
  const [activeTab, setActiveTab] = useState<"directory" | "resources">("directory")
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(id)
    setTimeout(() => {
      setCopiedField(null)
    }, 2000)
  }

  // Count resources per member
  const resourceCountByUserId = resources.reduce((acc, res) => {
    acc[res.userId] = (acc[res.userId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Filter resources
  const filteredResources = resources.filter((res) => {
    if (typeFilter !== "ALL" && res.type.toUpperCase() !== typeFilter) return false
    if (statusFilter !== "ALL" && res.status.toUpperCase() !== statusFilter) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = res.name?.toLowerCase().includes(q)
      const matchIdentifier = res.identifier?.toLowerCase().includes(q)
      const matchSpecs = res.specs?.toLowerCase().includes(q)
      const matchMember =
        res.user?.name?.toLowerCase().includes(q) ||
        res.user?.email?.toLowerCase().includes(q)
      return matchName || matchIdentifier || matchSpecs || matchMember
    }
    return true
  })

  // Format member options for dialog
  const memberOptions = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    user: {
      name: m.user.name,
      email: m.user.email,
    },
  }))

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
        {status}
      </span>
    )
  }

  // Summary counts for Admin
  const activeCount = resources.filter((r) => r.status === "ACTIVE").length
  const vmCount = resources.filter((r) => r.type === "VM").length
  const membersWithResourcesCount = new Set(resources.map((r) => r.userId)).size

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team & Resources</h2>
          <p className="text-sm text-muted-foreground">
            Manage your team directory, member workloads, and infrastructure allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <AllocateResourceDialog
              workspaceId={workspaceId}
              members={memberOptions}
            />
          )}
          <CreateMemberDialog workspaceId={workspaceId} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-muted/70 p-1 rounded-xl border max-w-md text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("directory")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-2",
            activeTab === "directory"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-4 w-4" />
          Team Members
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {members.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-2",
            activeTab === "resources"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Server className="h-4 w-4" />
          {isAdmin ? "All Resources" : "My Resources"}
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {resources.length}
          </Badge>
        </button>
      </div>

      {/* Tab 1: Team Directory */}
      {activeTab === "directory" && (
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          {members.map((member) => {
            const resCount = resourceCountByUserId[member.userId] || 0

            return (
              <Link key={member.id} href={`/${workspaceId}/team/${member.id}`}>
                <Card className="hover:border-primary transition-all shadow-xs flex flex-col items-center justify-between p-6 text-center space-y-4 h-full group relative">
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <User className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                        {member.user.name || "Member"}
                      </CardTitle>
                      {member.role ? (
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">
                          No role specified
                        </p>
                      )}
                      {member.user.email && (
                        <p className="text-xs text-muted-foreground/80 truncate max-w-[200px]">
                          {member.user.email}
                        </p>
                      )}
                    </div>

                    {/* Allocated Resources Indicator */}
                    {resCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                        <Server className="h-3 w-3" />
                        {resCount} {resCount === 1 ? "Resource" : "Resources"}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Profile & Resources <ArrowRight className="h-3 w-3" />
                  </div>
                </Card>
              </Link>
            )
          })}

          {members.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl bg-card/40">
              <User className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium text-base">No team members added yet.</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Click &quot;Add Member&quot; above to add team members and begin assigning tasks.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Resource Allocations View */}
      {activeTab === "resources" && (
        <div className="space-y-6">
          {/* Summary Stat Cards for Admin */}
          {isAdmin && (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="p-4 shadow-2xs">
                <p className="text-xs text-muted-foreground font-medium">Total Resources</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-2xl font-bold">{resources.length}</span>
                  <Server className="h-5 w-5 text-indigo-500/70" />
                </div>
              </Card>

              <Card className="p-4 shadow-2xs">
                <p className="text-xs text-muted-foreground font-medium">Active Status</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {activeCount}
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
              </Card>

              <Card className="p-4 shadow-2xs">
                <p className="text-xs text-muted-foreground font-medium">Virtual Machines</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-2xl font-bold">{vmCount}</span>
                  <Server className="h-5 w-5 text-indigo-500/70" />
                </div>
              </Card>

              <Card className="p-4 shadow-2xs">
                <p className="text-xs text-muted-foreground font-medium">Members with Resources</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-2xl font-bold">{membersWithResourcesCount}</span>
                  <ShieldCheck className="h-5 w-5 text-primary/70" />
                </div>
              </Card>
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, IP, specs, or member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Types</option>
                <option value="VM">Virtual Machines</option>
                <option value="CLOUD_INSTANCE">Cloud Instances</option>
                <option value="DATABASE">Databases</option>
                <option value="HARDWARE">Hardware</option>
                <option value="LICENSE">Licenses</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PROVISIONING">Provisioning</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DECOMMISSIONED">Decommissioned</option>
              </select>
            </div>
          </div>

          {/* Resources Grid */}
          {filteredResources.length === 0 ? (
            <Card className="border-dashed bg-card/40">
              <CardContent className="py-14 flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-sm">No resources match your criteria</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                    {searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL"
                      ? "Try clearing your search or filters to see all allocated resources."
                      : isAdmin
                      ? "No resources have been allocated in this workspace yet. Click 'Allocate Resource' to assign one."
                      : "No resources are currently allocated to you in this workspace."}
                  </p>
                </div>
                {isAdmin && (
                  <AllocateResourceDialog
                    workspaceId={workspaceId}
                    members={memberOptions}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredResources.map((res) => {
                const memberRecord = members.find((m) => m.userId === res.userId)

                return (
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
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {res.type}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">{getStatusBadge(res.status)}</div>
                      </div>

                      {/* Member Info */}
                      {isAdmin && res.user && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">
                            {res.user.name || res.user.email}
                          </span>
                          {memberRecord && (
                            <Link
                              href={`/${workspaceId}/team/${memberRecord.id}`}
                              className="text-[10px] text-primary hover:underline ml-auto"
                            >
                              Profile &rarr;
                            </Link>
                          )}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs pt-0 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {/* Specs */}
                        {res.specs && (
                          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-md font-mono text-[11px]">
                            <Cpu className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">{res.specs}</span>
                          </div>
                        )}

                        {/* Host / IP */}
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
                              onClick={() => handleCopy(res.identifier!, `dir-id-${res.id}`)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0 p-0.5 rounded"
                              title="Copy Host / IP"
                            >
                              {copiedField === `dir-id-${res.id}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Access info */}
                        {res.accessInfo && (
                          <div className="flex items-center justify-between gap-2 bg-muted/50 px-2.5 py-1.5 rounded-md font-mono text-[11px]">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-muted-foreground">Access:</span>
                              <span className="text-foreground/90 truncate">
                                {res.accessInfo}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(res.accessInfo!, `dir-access-${res.id}`)
                              }
                              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0 p-0.5 rounded"
                              title="Copy Access Details"
                            >
                              {copiedField === `dir-access-${res.id}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Notes */}
                        {res.notes && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 pt-0.5">
                            {res.notes}
                          </p>
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
                            members={memberOptions}
                            resourceToEdit={res}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
