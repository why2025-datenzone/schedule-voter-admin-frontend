import { useState, useMemo } from 'react';
import { useSubmissions } from "@/api/apiService";
import { useConferenceStore } from "@/store/conferenceStore";
import { SubmissionDetail } from "@/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";
import { Button } from "./ui/button"; 
import { RotateCw } from "lucide-react";

const SubmissionCard = ({ submission }: { submission: SubmissionDetail }) => {
    return (
        <Card className="w-full flex flex-col">
            <CardHeader>
                <CardTitle className="line-clamp-2">{submission.title}</CardTitle>
                {submission.code && <CardDescription>Code: {submission.code}</CardDescription>}
            </CardHeader>
            <CardContent className="flex-grow">
                <div
                    className="text-sm text-muted-foreground overflow-auto prose dark:prose-invert max-w-none"
                    style={{ maxHeight: '250px' }}
                    dangerouslySetInnerHTML={{ __html: submission.abstract || "<p>No abstract available.</p>" }}
                />
                {submission.time && (
                    <div className="mt-2 text-xs text-muted-foreground">
                        <p>Start: {new Date(submission.time.start*1000).toLocaleString()}</p>
                        <p>End: {new Date(submission.time.end*1000).toLocaleString()}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const SubmissionCardSkeleton = () => {
    return (
        <Card className="w-full flex flex-col">
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4 mt-1" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
            </CardContent>
        </Card>
    );
};

export function Submissions() {
    const { activeConference } = useConferenceStore();
    const eventSlug = activeConference?.slug;
    const [filterText, setFilterText] = useState('');

    const { 
        data: submissionsResponse, 
        isLoading, 
        isError, 
        error,
        refetch, 
        isRefetching 
    } = useSubmissions(eventSlug, {
        enabled: !!eventSlug,
    });

    const stripHtml = (html: string): string => {
        if (typeof DOMParser === 'undefined') return html;
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || "";
        } catch (e) {
            console.warn("Failed to parse HTML for stripping:", e);
            return html;
        }
    };

    const filteredSubmissions = useMemo(() => {
        if (!submissionsResponse?.submissions) return [];
        const submissionsArray = Object.entries(submissionsResponse.submissions);
        if (!filterText.trim()) {
            return submissionsArray;
        }
        const lowerCaseFilter = filterText.toLowerCase();
        return submissionsArray.filter(([_, submission]) =>
            submission.title.toLowerCase().includes(lowerCaseFilter) ||
            submission.abstract.toLowerCase().includes(lowerCaseFilter) ||
            stripHtml(submission.abstract).toLowerCase().includes(lowerCaseFilter)
        );
    }, [submissionsResponse, filterText]);

    const handleRefresh = () => {
        if (eventSlug) {
            refetch();
        }
    };

    if (!eventSlug) {
        return (
            <div className="p-4 md:p-6">
                <h2 className="text-2xl font-semibold mb-4">Submissions</h2>
                <p>Please select a conference to view submissions.</p>
            </div>
        );
    }

    if (isLoading && !isRefetching) {
        return (
            <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-2xl font-semibold">Submissions</h2>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Skeleton className="h-9 w-full sm:w-64" /> 
                        <Skeleton className="h-9 w-9" />
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, index) => (
                        <SubmissionCardSkeleton key={index} />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-6">
                <h2 className="text-2xl font-semibold mb-4">Submissions</h2>
                <p className="text-red-500">Error fetching submissions: {error?.message || "Unknown error"}</p>
                <Button onClick={handleRefresh} variant="outline" className="mt-2">
                    <RotateCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    Try Again
                </Button>
            </div>
        );
    }
    
    const totalSubmissions = submissionsResponse?.submissions ? Object.keys(submissionsResponse.submissions).length : 0;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                <h2 className="text-2xl font-semibold">Submissions</h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                        type="text"
                        placeholder="Filter by title or abstract..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="flex-grow sm:flex-grow-0 sm:w-64"
                        disabled={isRefetching}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefetching || isLoading}
                        title="Refresh submissions"
                    >
                        <RotateCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>
             <div className="mb-4 text-sm text-muted-foreground">
                {filterText ? `Showing ${filteredSubmissions.length} of ${totalSubmissions} submissions` : `Total: ${totalSubmissions} submissions`}
                {isRefetching && <span className="ml-2">(Refreshing...)</span>}
            </div>

            {filteredSubmissions.length === 0 && submissionsResponse && totalSubmissions > 0 ? (
                <p>No submissions match your filter criteria.</p>
            ) : filteredSubmissions.length === 0 && (!submissionsResponse || totalSubmissions === 0) ? (
                <p>No submissions found for this event.</p>
            ) : (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${isRefetching ? 'opacity-50 pointer-events-none' : ''}`}>
                    {filteredSubmissions.map(([id, submissionDetail]) => (
                        <SubmissionCard key={id} submission={submissionDetail} />
                    ))}
                </div>
            )}
             {isRefetching && !isLoading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                </div>
            )}
        </div>
    );
}