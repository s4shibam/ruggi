import { createFileRoute, Link, Outlet, redirect, useMatchRoute, useNavigate, useParams } from '@tanstack/react-router'
import { Clock, FolderOpen, type LucideIcon, Menu, PanelLeft, Plus, X } from 'lucide-react'
import { useState } from 'react'

import { Branding } from '@/components/blocks/branding'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { useGetAllChatSessions } from '@/hooks/api/chat'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import type { TChatSession, TUser } from '@/types/models'

const LabLayout = () => {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const { chatSessionId: currentChatSessionId } = useParams({ strict: false })

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const { data: unstarredChats } = useGetAllChatSessions({ page: 1, page_size: 5, is_starred: false })
  const { data: starredChats } = useGetAllChatSessions({ page: 1, page_size: 5, is_starred: true })

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  if (isLoading) {
    return <LabLoading />
  }

  if (!user) {
    navigate({
      to: '/auth/signin',
      search: { redirect: window.location.pathname + window.location.search }
    })
    return null
  }

  return (
    <div className="flex min-h-screen w-full bg-background font-lexend">
      {isMobileMenuOpen && (
        <Button
          variant="ghost"
          className="fixed inset-0 z-40 h-full w-full rounded-none bg-black/50 p-0 hover:bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsMobileMenuOpen(false)}
          aria-label="Close mobile menu"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out',
          isSidebarOpen ? 'w-64' : 'w-14',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          isMobileMenuOpen && 'w-64'
        )}
      >
        <div
          className={cn('flex h-14 w-full items-center justify-between border-b px-2 sm:px-3', {
            'justify-center': !isSidebarOpen && !isMobileMenuOpen
          })}
        >
          {(isSidebarOpen || isMobileMenuOpen) && (
            <>
              <Branding showText={true} />
              <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={toggleMobileMenu}>
                <X className="size-5" />
              </Button>
            </>
          )}
          <Button onClick={toggleSidebar} variant="ghost" size="icon" className="hidden size-8 md:flex">
            <PanelLeft className="size-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="scrollbar-hide flex flex-1 flex-col gap-3 overflow-y-auto p-2 sm:gap-4 sm:p-3">
          <div className="flex flex-col gap-2">
            <SidebarButton to="/lab/chat/new" icon={Plus} label="New Chat" isOpen={isSidebarOpen || isMobileMenuOpen} />
            <SidebarButton to="/lab/history" icon={Clock} label="History" isOpen={isSidebarOpen || isMobileMenuOpen} />
            <SidebarButton
              to="/lab/documents"
              icon={FolderOpen}
              label="Documents"
              isOpen={isSidebarOpen || isMobileMenuOpen}
            />
          </div>

          <ChatListSection
            title="Starred Chats"
            chats={starredChats?.data}
            currentChatSessionId={currentChatSessionId}
            isOpen={isSidebarOpen || isMobileMenuOpen}
          />

          <ChatListSection
            title="Recent Chats"
            chats={unstarredChats?.data}
            currentChatSessionId={currentChatSessionId}
            isOpen={isSidebarOpen || isMobileMenuOpen}
          />
        </div>

        <div className="flex flex-col gap-1 border-t p-2 sm:p-3">
          <ProfileButton isOpen={isSidebarOpen || isMobileMenuOpen} user={user} />
        </div>
      </aside>

      <main
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          'md:ml-64',
          !isSidebarOpen && 'md:ml-14'
        )}
      >
        <header className="flex h-16 items-center border-b px-2 sm:px-4 md:hidden">
          <Button onClick={toggleMobileMenu} variant="ghost" size="icon" className="mr-2">
            <Menu className="size-4" />
          </Button>
          <Branding />
        </header>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export const Route = createFileRoute('/lab')({
  beforeLoad: ({ context, location }) => {
    if (context.auth.isLoading) {
      return
    }

    if (!context.auth.isAuthenticated || !context.auth.user) {
      throw redirect({
        to: '/auth/signin',
        search: {
          redirect: location.pathname + location.search
        }
      })
    }
  },
  component: LabLayout
})

const LabLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
)

type TChatListSectionProps = {
  title: string
  chats: TChatSession[] | undefined
  currentChatSessionId: string | undefined
  isOpen: boolean
}

const ChatListSection = ({ title, chats, currentChatSessionId, isOpen }: TChatListSectionProps) => {
  if (!chats || chats.length === 0) {
    return null
  }

  return (
    <div className={cn('mt-4 flex flex-col gap-2', !isOpen && 'hidden')}>
      <h3 className="px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider sm:px-3">{title}</h3>
      <div className="flex flex-col gap-1">
        {chats.map((chat) => {
          const isActiveChatSession = currentChatSessionId === chat.id
          return (
            <Link
              key={chat.id}
              to="/lab/chat/$chatSessionId"
              params={{ chatSessionId: chat.id }}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sm:px-3',
                isActiveChatSession && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
              )}
            >
              <span className="truncate text-xs sm:text-sm">{chat.title || 'Untitled Chat'}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

type TSidebarButtonProps = {
  to: string
  icon: LucideIcon
  label: string
  isOpen: boolean
  className?: string
}

const SidebarButton = ({ to, icon: Icon, label, isOpen, className }: TSidebarButtonProps) => {
  const matchRoute = useMatchRoute()
  const isActive = matchRoute({ to, fuzzy: true })

  return (
    <Button
      asChild
      variant={isActive ? 'default' : 'ghost'}
      className={cn('h-7 justify-start sm:h-8', !isOpen && 'justify-center px-2', className)}
      size="sm"
    >
      <Link to={to} className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 sm:size-5" />
        <span className={cn('truncate transition-all', !isOpen && 'hidden w-0 opacity-0')}>{label}</span>
      </Link>
    </Button>
  )
}

type TProfileButtonProps = {
  isOpen: boolean
  user: TUser | null
}

const ProfileButton = ({ isOpen, user }: TProfileButtonProps) => {
  const matchRoute = useMatchRoute()
  const isActive = matchRoute({ to: '/lab/profile', fuzzy: true })

  return (
    <Button
      asChild
      variant={isActive ? 'default' : 'ghost'}
      className={cn(
        'h-10',
        { 'justify-start': isOpen },
        isActive && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90'
      )}
    >
      <Link to="/lab/profile" className="flex items-center gap-2">
        <UserAvatar user={user} className="size-6 shrink-0 sm:size-7" />
        {isOpen && (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden text-left transition-all duration-300">
            <span className="truncate font-medium text-xs sm:text-sm">{user?.full_name || 'Guest User'}</span>
            <span className="-mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[10px]">View Profile</span>
          </div>
        )}
      </Link>
    </Button>
  )
}
