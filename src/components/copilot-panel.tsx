"use client"

import React, { useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { Bot, X, Send, Loader2, Sparkles, User, FolderKanban, CheckSquare, UserPlus, Mail, Building2, FolderPlus, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function CopilotPanel({ workspaceId }: { workspaceId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    body: { workspaceId },
    maxToolRoundtrips: 5
  })

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-[0_10px_40px_rgba(79,70,229,0.5)] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white p-0 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1 z-50 border border-white/20"
      >
        <Sparkles className="h-6 w-6 animate-pulse" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[34rem] bg-background/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-8 fade-in-50 duration-300 ease-out">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 drop-shadow-sm" />
          <h3 className="font-semibold text-sm tracking-wide drop-shadow-sm">AI Copilot</h3>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          className="text-white/70 hover:text-white transition-all hover:rotate-90 hover:scale-110 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-muted/10">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-12 space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="h-8 w-8 text-indigo-500 opacity-60" />
            </div>
            <p className="text-sm font-medium">I'm your AI Copilot.</p>
            <p className="text-xs opacity-70 px-6 leading-relaxed">
              Ask me to list projects, find teammates, or create and assign tasks!
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
            <div 
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                m.role === 'user' 
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm shadow-md' 
                  : 'bg-card/90 backdrop-blur-sm border shadow-sm rounded-bl-sm text-foreground'
              }`}
            >
              {m.content && (
                <div className={`prose prose-sm dark:prose-invert max-w-none ${m.role === 'user' ? 'text-white prose-p:text-white prose-strong:text-white prose-a:text-indigo-200' : ''}`}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="pl-1" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                      a: ({node, ...props}) => <a className="text-indigo-500 hover:underline font-medium" {...props} />
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              )}

              {m.toolInvocations?.map((toolInvocation) => {
                const toolCallId = toolInvocation.toolCallId
                const toolName = toolInvocation.toolName

                return (
                  <div key={toolCallId} className={`text-[11px] rounded-lg p-2.5 border font-medium ${m.content ? 'mt-3' : ''} bg-muted/40`}>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                      {toolName === 'getWorkspaceData' && <FolderKanban className="h-3.5 w-3.5 text-blue-500" />}
                      {toolName === 'getUserWorkspaces' && <Building2 className="h-3.5 w-3.5 text-purple-500" />}
                      {toolName === 'createWorkspace' && <Building2 className="h-3.5 w-3.5 text-violet-500" />}
                      {toolName === 'createProject' && <FolderPlus className="h-3.5 w-3.5 text-cyan-500" />}
                      {toolName === 'createTask' && <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />}
                      {toolName === 'assignTask' && <User className="h-3.5 w-3.5 text-amber-500" />}
                      {toolName === 'addWorkspaceMember' && <UserPlus className="h-3.5 w-3.5 text-pink-500" />}
                      {toolName === 'updateUserEmail' && <Mail className="h-3.5 w-3.5 text-indigo-500" />}
                      {toolName === 'getMemberResources' && <Server className="h-3.5 w-3.5 text-teal-500" />}
                      {toolName === 'allocateResource' && <Server className="h-3.5 w-3.5 text-emerald-500" />}
                      <span className="font-semibold text-foreground/80 tracking-wide">
                        {toolName === 'getWorkspaceData' ? 'Fetching workspace data' 
                          : toolName === 'getUserWorkspaces' ? 'Listing your workspaces'
                          : toolName === 'createWorkspace' ? 'Creating new workspace'
                          : toolName === 'createProject' ? 'Creating project'
                          : toolName === 'createTask' ? 'Creating task'
                          : toolName === 'assignTask' ? 'Assigning task'
                          : toolName === 'addWorkspaceMember' ? 'Adding team member'
                          : toolName === 'updateUserEmail' ? 'Updating email address'
                          : toolName === 'getMemberResources' ? 'Checking allocated resources'
                          : toolName === 'allocateResource' ? 'Allocating resource'
                          : toolName}
                      </span>
                    </div>
                    {'result' in toolInvocation ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin text-indigo-500" /> In progress...
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start animate-in fade-in duration-300">
             <div className="bg-card/90 backdrop-blur-sm border shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
               <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
               <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
               <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
             </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-destructive text-center p-3 bg-destructive/10 rounded-xl border border-destructive/20 font-medium">
            Error: {error.message}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-card border-t shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask Copilot..."
            className="pr-12 rounded-full bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/20 shadow-inner transition-all"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            className="absolute right-1 top-1 h-7 w-7 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-sm"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Send className="h-3.5 w-3.5 text-white" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
