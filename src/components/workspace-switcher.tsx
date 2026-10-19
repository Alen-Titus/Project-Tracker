"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type Workspace = {
  id: string
  name: string
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: Workspace[]
  currentWorkspaceId: string
}) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold rounded-md hover:bg-secondary/80 h-10 border border-input bg-background"
      >
        <span className="truncate">{currentWorkspace?.name || "Select Workspace"}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 border-border" align="start">
        <Command>
          <CommandInput placeholder="Search workspaces..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Your Workspaces">
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={(currentValue) => {
                    setOpen(false)
                    router.push(`/${workspace.id}`)
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentWorkspaceId === workspace.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {workspace.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  router.push("/onboarding")
                }}
                className="cursor-pointer text-muted-foreground"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create new workspace
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
