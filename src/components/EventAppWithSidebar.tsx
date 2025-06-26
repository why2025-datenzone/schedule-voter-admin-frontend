import { Separator } from "@radix-ui/react-separator";
import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb";
import { useConferenceStore } from "@/store/conferenceStore";
import { NavLink } from "react-router-dom";


interface EventAppWithSidebarProps {
    MainContentComponent: React.ComponentType<any>; 
    Title: string;
}


export function EventAppWithSidebar({ MainContentComponent, Title }: Readonly<EventAppWithSidebarProps>) {
    const { activeConference } = useConferenceStore();
    console.log("Rendering with title", Title);

    return <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbPage>Events</BreadcrumbPage>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink asChild>

                                    <NavLink to={`/events/${activeConference?.slug}/overview`} >
                                        {activeConference ? activeConference.name : "-"}
                                    </NavLink>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{Title}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>
            <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
                <MainContentComponent />
            </div>
        </SidebarInset>
    </SidebarProvider>
}