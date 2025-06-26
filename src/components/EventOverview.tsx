import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEventOverview } from "@/api/apiService"
import { useConferenceStore } from "@/store/conferenceStore"
import { Skeleton } from "@/components/ui/skeleton"


export function Overview() {
    const { activeConference } = useConferenceStore();

    const {
        data,
        isLoading,
        isError,
    } = useEventOverview(activeConference?.slug);

    const isOverallLoading = isLoading || !activeConference;

    return (
        <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6 text-center">
            <Card className="@container/card">
                <CardHeader className="relative">
                <CardDescription>Voting</CardDescription>
                <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                    {isOverallLoading ? (
                        <Skeleton className="h-8 w-32 mx-auto" />
                    ) : (
                        activeConference?.voting_enabled ? "enabled" : "disabled"
                    )}
                </CardTitle>
                </CardHeader>
            </Card>
            <Card className="@container/card">
                <CardHeader className="relative">
                <CardDescription>Total Submissions</CardDescription>
                <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                    {isOverallLoading ? (
                        <Skeleton className="h-8 w-16 mx-auto" />
                    ) : (
                        isError ? "-" : data?.total_submissions
                    )}
                </CardTitle>
                </CardHeader>
            </Card>
            <Card className="@container/card">
                <CardHeader className="relative">
                <CardDescription>Total Voters</CardDescription>
                <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                    {isOverallLoading ? (
                        <Skeleton className="h-8 w-16 mx-auto" />
                    ) : (
                        isError ? "-" : data?.total_voters
                    )}
                </CardTitle>
                </CardHeader>
            </Card>
            <Card className="@container/card">
                <CardHeader className="relative">
                <CardDescription>Total Sources</CardDescription>
                <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                    {isOverallLoading ? (
                        <Skeleton className="h-8 w-16 mx-auto" />
                    ) : (
                        isError ? "-" : data?.total_sources
                    )}
                </CardTitle>
                </CardHeader>
            </Card>
        </div>
    )
}