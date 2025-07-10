import { useState, useMemo } from 'react';
import { useSimilarSubmissions } from '@/api/apiService';
import { ConflictType, SubmissionDetail } from '@/api/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertTriangle } from '@tabler/icons-react';

interface SimilarSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventSlug: string;
  submission: SubmissionDetail & { id: string };
  allSubmissions: Record<string, SubmissionDetail>;
  initialMetric?: ConflictType;
}

export function SimilarSubmissionsDialog({ open, onOpenChange, eventSlug, submission, allSubmissions, initialMetric }: Readonly<SimilarSubmissionsDialogProps>) {
  const [selectedMetric, setSelectedMetric] = useState<ConflictType>(initialMetric ?? 'expanded');
  const [count, setCount] = useState<number>(10);

  const { data: similarSubmissions, isLoading, isError, error } = useSimilarSubmissions(
    eventSlug,
    submission.id,
    selectedMetric,
    count,
    { enabled: open } // Only fetch when dialog is open
  );

  const tableData = useMemo(() => {
    if (!similarSubmissions) return [];
    return similarSubmissions.map(item => ({
      ...item,
      details: allSubmissions[item.id]
    })).filter(item => item.details); // Ensure we have details for the submission
  }, [similarSubmissions, allSubmissions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Submissions similar to "{submission.title}"</DialogTitle>
          <DialogDescription>
            {submission.time && (
              <>
              <b>Start</b>: {new Date(submission.time.start*1000).toLocaleString()}, <b>End</b>: {new Date(submission.time.end*1000).toLocaleString()}, <b>Room</b>: {submission.time.room || "-"}<br />
              </>
            )}
            Showing top {count} most similar submissions based on the "{selectedMetric}" metric.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <ToggleGroup
                type="single"
                value={selectedMetric}
                onValueChange={(value) => {
                  if (value) setSelectedMetric(value as ConflictType);
                }}
                aria-label="Similarity Metric"
                disabled={isLoading}
                className="flex flex-wrap gap-2 justify-center"
              >
                <ToggleGroupItem value="expanded" aria-label="Expanded" className="px-3 py-1.5 sm:px-6">
                    Expanded
                </ToggleGroupItem>
                <ToggleGroupItem value="up" aria-label="Up Voted" className="px-3 py-1.5 sm:px-6">
                    Up Voted
                </ToggleGroupItem>
                <ToggleGroupItem value="expanded-without-down" aria-label="Expanded - Down" className="px-3 py-1.5 sm:px-6 whitespace-nowrap">
                    Expanded - Down
                </ToggleGroupItem>
              </ToggleGroup>

              <ToggleGroup
                type="single"
                value={String(count)}
                onValueChange={(value) => {
                  if (value) setCount(Number(value));
                }}
                aria-label="Number of similar submissions"
                disabled={isLoading}
                className="flex flex-wrap gap-2 justify-center"
              >
                <ToggleGroupItem value="10" aria-label="10 results" className="px-3 py-1.5 sm:px-4">10</ToggleGroupItem>
                <ToggleGroupItem value="25" aria-label="25 results" className="px-3 py-1.5 sm:px-4">25</ToggleGroupItem>
                <ToggleGroupItem value="50" aria-label="50 results" className="px-3 py-1.5 sm:px-4">50</ToggleGroupItem>
                <ToggleGroupItem value="100" aria-label="100 results" className="px-3 py-1.5 sm:px-4">100</ToggleGroupItem>
              </ToggleGroup>
          </div>
          
          <div className="rounded-md border max-h-[50vh] overflow-y-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right w-[100px]">Metric</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-destructive">
                      <div className="flex items-center justify-center gap-2">
                        <IconAlertTriangle />
                        <span>Error: {error?.message || 'Failed to load similar submissions.'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No similar submissions found for this metric.
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.details?.code || 'N/A'}</TableCell>
                      <TableCell className="whitespace-normal align-top">
                        <div className="line-clamp-2" title={item.details?.title || ''}>
                          {item.details?.title || 'Unknown Submission'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{(item.metric * 100).toFixed(2)}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}