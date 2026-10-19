"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getNotifications, markNotificationRead, markAllRead } from "@/actions/notifications"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Bell, Check, Loader2 } from "lucide-react"

type Notification = {
  id: string
  message: string
  link: string | null
  read: boolean
  createdAt: Date
}

export function NotificationsPopover({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const data = await getNotifications(workspaceId)
      setNotifications(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (workspaceId) {
      fetchNotifications()
      // Setup simple polling every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [workspaceId])

  const handleNotificationClick = async (n: Notification) => {
    setOpen(false)
    if (!n.read) {
      setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif))
      await markNotificationRead(workspaceId, n.id)
    }
    if (n.link) {
      router.push(n.link)
    }
  }

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await markAllRead(workspaceId)
  }

  return (
    <Popover open={open} onOpenChange={(val) => {
      setOpen(val)
      if (val) fetchNotifications() // Refresh on open
    }}>
      <PopoverTrigger className="relative p-2 rounded-full hover:bg-muted transition-colors focus:outline-none">
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="p-8 flex justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
              <Bell className="h-8 w-8 mb-3 opacity-20" />
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 text-left transition-colors hover:bg-muted/50 ${n.read ? 'opacity-70' : 'bg-primary/5'}`}
                >
                  <div className="flex items-start gap-3">
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className="space-y-1">
                      <p className="text-xs font-medium leading-snug">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
