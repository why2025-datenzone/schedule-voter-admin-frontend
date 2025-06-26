import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useConferenceStore } from "@/store/conferenceStore";
import { NavLink } from "react-router-dom";
import { CiSettings } from "react-icons/ci"; 
import { GrOverview, GrNotes, GrDocumentUpload } from "react-icons/gr"; 
import { MdOutlineHowToVote } from "react-icons/md";
import { FaPeopleArrows } from "react-icons/fa";
import { IconUsersGroup, IconSettings as IconGeneralSettings } from "@tabler/icons-react"; 


export function NavEvent() {
  const { activeConference } = useConferenceStore();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      { activeConference ? 
        <>
            <SidebarMenuButton asChild>
                <NavLink to={`/events/${activeConference.slug}/overview`} >
                    <GrOverview />
                    <span>Overview</span>
                </NavLink>
            </SidebarMenuButton>

            { activeConference?.permissions.configure &&
                <>
                    <SidebarGroupLabel>Settings</SidebarGroupLabel>
                    <SidebarMenuButton asChild>
                        <NavLink to={`/events/${activeConference.slug}/settings`} >
                            <IconGeneralSettings stroke={1.5} />
                            <span>General Settings</span>
                        </NavLink>
                    </SidebarMenuButton>
                    <SidebarMenuButton asChild>
                        <NavLink to={`/events/${activeConference.slug}/sources`} >
                            <CiSettings />
                            <span>Configure Sources</span>
                        </NavLink>
                    </SidebarMenuButton>
                    <SidebarMenuButton asChild>
                       <NavLink to={`/events/${activeConference.slug}/users`} >
                           <IconUsersGroup stroke={1.5} />
                           <span>Manage Users</span>
                       </NavLink>
                   </SidebarMenuButton>
                </>
            }
            { activeConference?.permissions.update &&
                <>
                    <SidebarGroupLabel>Update</SidebarGroupLabel>
                    <SidebarMenuButton asChild>
                        <NavLink to={`/events/${activeConference.slug}/update`} >
                            <GrDocumentUpload />
                            <span>Update URLs</span>
                        </NavLink>
                    </SidebarMenuButton>
                </>
            }
            { activeConference?.permissions.view &&
                <>
                    <SidebarGroupLabel>View</SidebarGroupLabel>
                    <SidebarMenuButton asChild>
                        <NavLink to={`/events/${activeConference.slug}/submissions`} >
                            <GrNotes />
                            <span>Submissions</span>
                        </NavLink>
                    </SidebarMenuButton>
                    <SidebarMenuButton asChild>
                        <NavLink to={`/events/${activeConference.slug}/votes`} >
                            <MdOutlineHowToVote />
                            <span>Votes</span>
                        </NavLink>
                    </SidebarMenuButton>
                    <SidebarMenuButton asChild>
                        <NavLink to={`/events/${activeConference.slug}/conflicts`} >
                            <FaPeopleArrows />
                            <span>Conflicts</span>
                        </NavLink>
                    </SidebarMenuButton>
                </>
            }
        </>
      :
        <SidebarGroupLabel>Loading</SidebarGroupLabel>
      }
    </SidebarGroup>
  )
}