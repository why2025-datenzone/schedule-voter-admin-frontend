import * as React from "react"
import { ChevronsUpDown, GalleryVerticalEnd, PlusCircle } from "lucide-react"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	useSidebar,
} from "@/components/ui/sidebar"
import type { EventPermissions } from "@/api/types"
import { ActiveConference } from "@/store/conferenceStore"
import { CreateConferenceDialog } from "./CreateConferenceDialog" 
import { FaPeopleRoof } from "react-icons/fa6"
import { useNavigate } from "react-router-dom"

type FetchedConferenceTeam = {
  name: string;
  slug: string;
  permissions: EventPermissions;
  voting_enabled: boolean;
}

interface EventSwitcherProps {
	isLoading: boolean
	isError: boolean
	error: Error | null
	teams?: Record<string, FetchedConferenceTeam>
	canCreateEvents?: boolean
	activeConference: ActiveConference | null
}

export function EventSwitcher({ isLoading, isError, error, teams, canCreateEvents, activeConference }: EventSwitcherProps) {
	const { isMobile } = useSidebar()
	const navigate = useNavigate()

	const [isDropdownMenuOpen, setIsDropdownMenuOpen] = React.useState(false)
	const [isCreateConferenceDialogOpen, setIsCreateConferenceDialogOpen] = React.useState(false)
	const [shouldOpenCreateDialogAfterMenuClose, setShouldOpenCreateDialogAfterMenuClose] = React.useState(false)

	const fetchedConferenceTeams = teams
	const userCanCreateEvents = canCreateEvents

  const handleSelectTeam = (team: FetchedConferenceTeam) => {
    navigate(`/events/${team.slug}/overview`);
  };

  const handleDropdownOpenChange = (open: boolean) => {
    setIsDropdownMenuOpen(open);
    if (!open && shouldOpenCreateDialogAfterMenuClose) {
      setIsCreateConferenceDialogOpen(true); 
      setShouldOpenCreateDialogAfterMenuClose(false); 
    }
  };

  if (isLoading) {
    return (
      <div className="p-2">
        <SidebarMenuSkeleton showIcon={true} />
      </div>
    );
  }

  if (isError) {
    console.error("Failed to fetch conferences in TeamSwitcher:", error);
    return <div className="p-2 text-xs text-red-500">Error loading conferences. Refresh page.</div>;
  }
  
  const noConferencesAvailable = !fetchedConferenceTeams || Object.keys(fetchedConferenceTeams).length === 0;

  if (noConferencesAvailable && !userCanCreateEvents) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                 <SidebarMenuButton size="lg" disabled className="opacity-50">
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <GalleryVerticalEnd className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">No Conferences</span>
                         <span className="truncate text-xs">Not allowed to create</span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu onOpenChange={handleDropdownOpenChange} open={isDropdownMenuOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                disabled={noConferencesAvailable && !userCanCreateEvents}
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  {activeConference ? <FaPeopleRoof className="size-4" /> : <GalleryVerticalEnd className="size-4" />}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeConference ? activeConference.name : (noConferencesAvailable ? "No Conferences" : "Select Conference")}
                  </span>
                  {activeConference && <span className="truncate text-xs">{activeConference.permissions.role}</span>}
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Conferences
              </DropdownMenuLabel>
              {fetchedConferenceTeams && Object.values(fetchedConferenceTeams).map(team => (
                <DropdownMenuItem
                  key={team.slug}
                  onClick={() => handleSelectTeam(team)}
                  className="gap-2 p-2 cursor-pointer"
                >
                  {team.name}
                </DropdownMenuItem>
              ))}
              {userCanCreateEvents && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => { 
                      setShouldOpenCreateDialogAfterMenuClose(true);
                    }}
                    className="cursor-pointer"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create new conference
                  </DropdownMenuItem>
                </>
              )}
               {noConferencesAvailable && !userCanCreateEvents && (
                <DropdownMenuItem disabled>No conferences available</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateConferenceDialog
        open={isCreateConferenceDialogOpen}
        onOpenChange={setIsCreateConferenceDialogOpen}
      />
    </>
  );
}