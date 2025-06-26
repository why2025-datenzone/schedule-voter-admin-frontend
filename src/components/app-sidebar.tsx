import * as React from "react"

import { EventSwitcher } from "@/components/EventSwitcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { NavEvent } from "./nav-event"
import { NavUser } from "./nav-user"

import { useEvents } from "@/api/apiService"
import type { EventDetail, EventPermissions, EventsResponse } from "@/api/types"
import { useConferenceStore } from "@/store/conferenceStore"
import { useUserStore } from "@/store/userStore"
import { useNavigate, useParams } from "react-router-dom"

type FetchedConferenceTeam = {
	name: string
	slug: string
	permissions: EventPermissions
	voting_enabled: boolean
}

type FetchedUser = {
	name: string
	email: string
}

interface TeamSwitcherData {
	teams: Record<string, FetchedConferenceTeam>
	can_create_events: boolean
	user: FetchedUser
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { activeConference, setActiveConference } = useConferenceStore()
	const { activeUser, setActiveUser } = useUserStore()
	const navigate = useNavigate()
	const { slug } = useParams<{ slug?: string }>()

	const { data, isLoading, isError, error } = useEvents<TeamSwitcherData>({
		select: (apiResponse: EventsResponse): TeamSwitcherData => {
			const teams = apiResponse?.events
				? Object.values(apiResponse.events).reduce((acc, conference: EventDetail) => {
						acc[conference.slug] = {
							name: conference.name,
							slug: conference.slug,
							permissions: conference.permissions,
							voting_enabled: conference.voting_enabled,
						}
						return acc
				  }, {} as Record<string, FetchedConferenceTeam>)
				: {}
			return {
				teams,
				can_create_events: apiResponse?.can_create ?? false,
				user: apiResponse?.user ?? null,
			}
		},
	})

	const fetchedConferenceTeams = data?.teams
	const userCanCreateEvents = data?.can_create_events
	const fetchedUser = data?.user

	React.useEffect(() => {
		if (isLoading || fetchedUser === undefined) {
			return
		}

		if (!activeUser || activeUser.email !== fetchedUser?.email || activeUser.name !== fetchedUser?.name) {
			setActiveUser({ name: fetchedUser?.name ?? "", email: fetchedUser?.email ?? "" })
		}
	}, [activeUser, setActiveUser, fetchedUser, isLoading])

	React.useEffect(() => {
		if (isLoading || fetchedConferenceTeams === undefined) {
			return
		}

		if (fetchedUser !== undefined && (!activeUser || (activeUser.email !== fetchedUser?.email || activeUser.name !== fetchedUser?.name))) {
			setActiveUser({ name: fetchedUser?.name ?? "", email: fetchedUser?.email ?? "" })
		}

		if (Object.keys(fetchedConferenceTeams).length === 0) {
			if (activeConference !== null) {
				setActiveConference(null)
			}
			if (slug && window.location.hash !== "#/") {
				navigate("/", { replace: true })
			}
			return
		}

		if (slug) {
			if (Object.prototype.hasOwnProperty.call(fetchedConferenceTeams, slug)) {
				const conferenceFromUrl = fetchedConferenceTeams[slug]
				if (activeConference?.slug !== slug) {
					// Original simpler condition
					setActiveConference(conferenceFromUrl)
				}
			} else {
				const defaultConference = Object.values(fetchedConferenceTeams)[0]
				navigate(`/events/${defaultConference.slug}/overview`, { replace: true })
			}
		} else {
			const defaultConference = Object.values(fetchedConferenceTeams)[0]
			navigate(`/events/${defaultConference.slug}/overview`, { replace: true })
		}
	}, [slug, fetchedConferenceTeams, isLoading, activeConference, setActiveConference, navigate, activeUser, fetchedUser, setActiveUser])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <EventSwitcher
          isLoading={isLoading}
          isError={isError}
          error={error}
          teams={fetchedConferenceTeams}
          canCreateEvents={userCanCreateEvents}
          activeConference={activeConference}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavEvent />
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}