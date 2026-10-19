"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { searchWorkspace } from "@/actions/search"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { FolderKanban, CheckSquare, User, Loader2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

type SearchResults = {
  tasks: Array<{ id: string, title: string, status: string, projectId: string }>
  projects: Array<{ id: string, name: string }>
  members: Array<{ id: string, user: { name: string | null, email: string | null } }>
}

export function CommandMenu() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params?.workspaceId as string | undefined

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 300)
  const [results, setResults] = useState<SearchResults>({ tasks: [], projects: [], members: [] })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    if (!workspaceId || !open) return

    if (debouncedQuery.length < 2) {
      setResults({ tasks: [], projects: [], members: [] })
      return
    }

    let isMounted = true
    setIsLoading(true)
    searchWorkspace(workspaceId, debouncedQuery).then((res) => {
      if (isMounted) {
        setResults(res)
        setIsLoading(false)
      }
    })

    return () => { isMounted = false }
  }, [debouncedQuery, workspaceId, open])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  if (!workspaceId) return null

  return (
    <>
      {/* Trigger Button to show keyboard shortcut */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-md border transition-colors w-64"
      >
        <span className="flex-1 text-left">Search workspace...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput 
            placeholder="Type a command or search..." 
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            
            {!isLoading && query.length >= 2 && results.tasks.length === 0 && results.projects.length === 0 && results.members.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {!isLoading && results.projects.length > 0 && (
              <CommandGroup heading="Projects">
                {results.projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.name}
                    onSelect={() => runCommand(() => router.push(`/${workspaceId}/projects/${project.id}`))}
                  >
                    <FolderKanban className="mr-2 h-4 w-4 text-primary" />
                    <span>{project.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isLoading && results.projects.length > 0 && (results.tasks.length > 0 || results.members.length > 0) && <CommandSeparator />}

            {!isLoading && results.tasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {results.tasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.title}
                    onSelect={() => runCommand(() => router.push(`/${workspaceId}/projects/${task.projectId}`))}
                  >
                    <CheckSquare className="mr-2 h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span>{task.title}</span>
                      <span className="text-[10px] text-muted-foreground">in project</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isLoading && results.tasks.length > 0 && results.members.length > 0 && <CommandSeparator />}

            {!isLoading && results.members.length > 0 && (
              <CommandGroup heading="Team">
                {results.members.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.user.name || member.user.email || ""}
                    onSelect={() => runCommand(() => router.push(`/${workspaceId}/team/${member.id}`))}
                  >
                    <User className="mr-2 h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span>{member.user.name || "Unknown"}</span>
                      <span className="text-[10px] text-muted-foreground">{member.user.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
