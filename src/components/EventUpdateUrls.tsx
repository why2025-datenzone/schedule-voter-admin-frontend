import { useParams } from 'react-router-dom';
import { useConferenceStore } from '@/store/conferenceStore';
import { useEventSourceUpdateUrls } from '@/api/apiService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { IconCopy, IconAlertTriangle, IconRefresh } from '@tabler/icons-react'; 
import { toast } from 'sonner'; 
import { cn } from '@/lib/utils'; 

export function EventUpdateUrls() {
    const { activeConference } = useConferenceStore();
    const params = useParams<{ slug?: string }>();
    const eventSlug = params.slug || activeConference?.slug;

    const {
        data: sourceUrlsData,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching, 
    } = useEventSourceUpdateUrls(eventSlug, {
        enabled: !!eventSlug,
    });

    const handleCopy = async (textToCopy: string, urlType: string) => {
        if (!navigator.clipboard) {
            toast.error('Clipboard API not available.');
            return;
        }
        try {
            await navigator.clipboard.writeText(textToCopy);
            toast.success(`${urlType} copied to clipboard!`);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            toast.error('Failed to copy URL.');
        }
    };

    if (!eventSlug) {
        return (
            <div className="p-4 md:p-6 text-center">
                <p className="text-muted-foreground">Please select an event to view update URLs.</p>
            </div>
        );
    }

    if (isLoading && !isRefetching) { 
        return (
            <div className="p-4 md:p-6 space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Source Update URLs</h2>
                    <Skeleton className="h-9 w-24" />
                </div>
                <div className="space-y-6"> 
                    {[...Array(2)].map((_, index) => ( 
                        <Card key={index}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-full" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Skeleton className="h-4 w-1/3 mb-1" />
                                    <div className="flex items-center space-x-2">
                                        <Skeleton className="h-9 flex-grow" />
                                        <Skeleton className="h-9 w-9" />
                                    </div>
                                </div>
                                <div>
                                    <Skeleton className="h-4 w-1/3 mb-1" />
                                    <div className="flex items-center space-x-2">
                                        <Skeleton className="h-9 flex-grow" />
                                        <Skeleton className="h-9 w-9" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-6 text-center text-destructive">
                <IconAlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error Fetching Update URLs</h2>
                <p className="mb-4">{error?.message || 'An unknown error occurred.'}</p>
                <Button onClick={() => refetch()} variant="outline" disabled={isRefetching}>
                    {isRefetching ? 'Retrying...' : 'Try Again'}
                </Button>
            </div>
        );
    }
    
    const hasData = sourceUrlsData && Object.keys(sourceUrlsData).length > 0;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                <h2 className="text-2xl font-semibold">
                    Source Update URLs: {activeConference?.name || 'Event'}
                </h2>
                 <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isRefetching || isLoading}>
                    <IconRefresh className={cn("mr-2 h-4 w-4", (isRefetching || (isLoading && !sourceUrlsData)) && "animate-spin")} />
                    {isRefetching || (isLoading && !sourceUrlsData) ? 'Refreshing...' : 'Refresh URLs'}
                </Button>
            </div>
            
            {isRefetching && !isLoading && (
                <div className="mb-4 text-sm text-muted-foreground italic">Updating URLs...</div>
            )}

            {!hasData && !isLoading && !isRefetching ? (
                 <div className="p-4 md:p-6 text-center">
                    <p className="text-muted-foreground mt-4">No sources configured or no update URLs available for this event.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(sourceUrlsData || {}).map(([sourceId, urls]) => (
                        <Card key={sourceId}>
                            <CardHeader>
                                <CardTitle>Source ID: {sourceId}</CardTitle>
                                <CardDescription>API URLs for this data source. Use these URLs in your external scripts to push submission or schedule updates.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor={`submission-url-${sourceId}`} className="text-sm font-medium text-muted-foreground mb-1 block">
                                        Submission Update URL
                                    </Label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            id={`submission-url-${sourceId}`}
                                            type="text"
                                            value={urls.submission_update_url}
                                            readOnly
                                            className="flex-grow bg-muted/30 dark:bg-input/20 text-xs"
                                            aria-label={`Submission update URL for source ${sourceId}`}
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleCopy(urls.submission_update_url, 'Submission URL')}
                                            title="Copy Submission URL"
                                        >
                                            <IconCopy className="h-4 w-4" />
                                            <span className="sr-only">Copy Submission URL</span>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}