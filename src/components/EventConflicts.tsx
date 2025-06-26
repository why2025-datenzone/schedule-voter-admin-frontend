import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useConferenceStore } from '@/store/conferenceStore';
import { useConflicts, useSubmissions } from '@/api/apiService';
import { ConflictType, SubmissionDetail } from '@/api/types';

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { IconRotate, IconAlertTriangle, IconChevronDown, IconChevronUp, IconChevronsDown } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  Header,
  Column,
} from "@tanstack/react-table";

interface ConflictTableRow {
  id: string;
  subACode?: string;
  subATitle?: string;
  subAId: string;
  subBCode?: string;
  subBTitle?: string;
  subBId: string;
  correlation: number;
}

const createSortableHeader = (
    column: Column<ConflictTableRow, unknown>,
    headerText: string,
    alignRight: boolean = false
  ) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className={cn(
          "px-2 py-1 h-auto w-full flex items-center",
          alignRight ? "justify-end -mr-2" : "justify-start -ml-2 text-left"
        )}
      >
        <span className="truncate">{headerText}</span>
        {column.getIsSorted() === "asc" ? <IconChevronUp className="ml-2 h-4 w-4 shrink-0" /> :
         column.getIsSorted() === "desc" ? <IconChevronDown className="ml-2 h-4 w-4 shrink-0" /> :
         <IconChevronsDown className="ml-2 h-4 w-4 opacity-30 shrink-0" />}
      </Button>
    );
};

const ResizableHeader = ({ header }: { header: Header<ConflictTableRow, unknown> }) => (
    <> 
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cn(
            "absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none touch-none z-10", 
            "bg-slate-300/50 dark:bg-slate-700/50 opacity-0 group-hover/tableheader:opacity-100 active:opacity-100 transition-opacity",
            header.column.getIsResizing() ? "bg-primary opacity-100" : ""
          )}
        />
      )}
    </>
);


export function Conflicts() {
    const { activeConference } = useConferenceStore();
    const params = useParams<{ slug?: string }>();
    const eventSlug = params.slug || activeConference?.slug;

    const initialConflictCount = 20;

    const [selectedConflictType, setSelectedConflictType] = useState<ConflictType>('expanded');
    const [conflictCount, setConflictCount] = useState<number>(initialConflictCount);
    const [sliderValue, setSliderValue] = useState<number>(initialConflictCount);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const {
        data: conflictsData,
        isLoading: isLoadingConflicts,
        isError: isErrorConflicts,
        error: errorConflicts,
        refetch: refetchConflicts,
    } = useConflicts(
        eventSlug!,
        selectedConflictType,
        conflictCount,
        { enabled: !!eventSlug }
    );

    const {
        data: submissionsResponse,
        isLoading: isLoadingSubmissions,
        isError: isErrorSubmissions,
        error: errorSubmissions,
        refetch: refetchSubmissions,
    } = useSubmissions(eventSlug, { enabled: !!eventSlug });

    const handleRefresh = async () => {
        if (!eventSlug || isRefreshing) return;
        setIsRefreshing(true);
        try {
            await Promise.all([refetchConflicts(), refetchSubmissions()]);
        } catch (err) {
            console.error("Error refreshing conflicts data:", err);
        } finally {
            setIsRefreshing(false);
        }
    };
    
    useEffect(() => {
        if (eventSlug) {
            refetchConflicts();
        }
    }, [selectedConflictType, conflictCount, eventSlug]); 

    const columns = useMemo<ColumnDef<ConflictTableRow>[]>(() => [
        { 
            accessorKey: 'subACode', 
            header: ({ column }) => createSortableHeader(column, 'Code (A)'),
            cell: info => info.getValue() ?? '-',
            size: 100, minSize: 80,
        },
        { 
            accessorKey: 'subATitle', 
            header: ({ column }) => createSortableHeader(column, 'Title (A)'),
            cell: info => <div className="line-clamp-2" title={info.getValue() as string}>{info.getValue() as string ?? '-'}</div>,
            size: 250, minSize: 150,
        },
        { 
            accessorKey: 'subBCode', 
            header: ({ column }) => createSortableHeader(column, 'Code (B)'),
            cell: info => info.getValue() ?? '-',
            size: 100, minSize: 80,
        },
        { 
            accessorKey: 'subBTitle', 
            header: ({ column }) => createSortableHeader(column, 'Title (B)'),
            cell: info => <div className="line-clamp-2" title={info.getValue() as string}>{info.getValue() as string ?? '-'}</div>,
            size: 250, minSize: 150,
        },
        { 
            accessorKey: 'correlation', 
            header: ({ column }) => createSortableHeader(column, 'Metric', true),
            cell: info => {
                const value = info.getValue<number>();
                return (
                    <div className="text-right">{value != null ? `${(value * 100).toFixed(3)}%` : '-'}</div>
                );
            },
            size: 100, minSize: 80,
        },
    ], []);

    const tableData = useMemo<ConflictTableRow[]>(() => {
        if (!conflictsData || !submissionsResponse?.submissions) {
            return [];
        }
        const submissionsMap = submissionsResponse.submissions;
        return conflictsData.map((conflict, index) => {
            const subA: SubmissionDetail | undefined = submissionsMap[conflict.a];
            const subB: SubmissionDetail | undefined = submissionsMap[conflict.b];
            return {
                id: `${conflict.a}-${conflict.b}-${index}-${selectedConflictType}`,
                subACode: subA?.code || 'N/A',
                subATitle: subA?.title || `Unknown (${conflict.a})`,
                subAId: conflict.a,
                subBCode: subB?.code || 'N/A',
                subBTitle: subB?.title || `Unknown (${conflict.b})`,
                subBId: conflict.b,
                correlation: conflict.correlation,
            };
        });
    }, [conflictsData, submissionsResponse, selectedConflictType]);

    const table = useReactTable({
        data: tableData,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
        defaultColumn: {
            minSize: 80,
            size: 150,
        }
    });

    if (!eventSlug) {
        return (
            <div className="p-4 md:p-6 text-center">
                <p className="text-muted-foreground">Please select an event to view conflicts.</p>
            </div>
        );
    }
    
    const isInitialLoading = isLoadingSubmissions || (isLoadingConflicts && !conflictsData);

    return (
        <div className="p-4 md:p-6">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle>Conflicting Submissions</CardTitle>
                        <CardDescription>
                            Top {isLoadingConflicts && !conflictsData ? sliderValue : conflictCount} conflicts
                            of the selected type.
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing || !eventSlug || isLoadingConflicts || isLoadingSubmissions}
                        title="Refresh conflicts"
                        className="shrink-0"
                    >
                        <IconRotate className={`h-4 w-4 ${isRefreshing || (isLoadingConflicts && !!conflictsData) || (isLoadingSubmissions && !!submissionsResponse) ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ToggleGroup
                        type="single"
                        value={selectedConflictType}
                        onValueChange={(value) => {
                            if (value) setSelectedConflictType(value as ConflictType);
                        }}
                        aria-label="Conflict Type"
                        disabled={isRefreshing || isInitialLoading || isLoadingConflicts}
                        className="flex flex-wrap gap-2"
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

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="conflict-count-slider">Number of Conflicts:</Label>
                            <span className="text-sm font-medium w-10 text-right">{sliderValue}</span>
                        </div>
                        <Slider
                            id="conflict-count-slider"
                            min={1}
                            max={100}
                            step={1}
                            value={[sliderValue]}
                            onValueChange={(newSliderValue: number[]) => setSliderValue(newSliderValue[0])}
                            disabled={isRefreshing || isInitialLoading || isLoadingConflicts}
                            onValueCommit={(committedValue: number[]) => setConflictCount(committedValue[0])}
                            className="w-full"
                        />
                    </div>

                    {isInitialLoading ? (
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-10 w-full rounded-md" />
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
                        </div>
                    ) : isErrorSubmissions ? (
                        <div className="text-destructive p-4 border border-destructive/50 rounded-md bg-destructive/10 flex items-center">
                            <IconAlertTriangle className="inline-block mr-2 h-5 w-5" />
                            Error loading submission details: {errorSubmissions?.message || "Unknown error"}
                        </div>
                    ) : isErrorConflicts ? (
                        <div className="text-destructive p-4 border border-destructive/50 rounded-md bg-destructive/10 flex items-center">
                            <IconAlertTriangle className="inline-block mr-2 h-5 w-5" />
                            Error loading conflicts: {errorConflicts?.message || "Unknown error"}
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table style={{ width: table.getCenterTotalSize(), tableLayout: 'fixed' }}>
                                <TableHeader className="bg-muted/50 dark:bg-muted/30 group/tableheader sticky top-0 z-10">
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <TableHead 
                                                    key={header.id}
                                                    style={{ width: header.getSize() }}
                                                    className="p-0 whitespace-nowrap relative"
                                                >
                                                     <ResizableHeader header={header} />
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map(row => (
                                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/30 dark:hover:bg-muted/20">
                                                {row.getVisibleCells().map(cell => (
                                                    <TableCell 
                                                        key={cell.id}
                                                        style={{ width: cell.column.getSize() }}
                                                        className="p-2 align-top text-sm"
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                                No conflicts found for this type.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                     {(!isInitialLoading && !isErrorConflicts && !isErrorSubmissions && tableData.length > 0) && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                            Showing {tableData.length > conflictCount ? `top ${conflictCount}` : tableData.length} conflicts. 
                            {isLoadingConflicts && !isInitialLoading && <span className="ml-2 italic">(Updating conflicts...)</span>}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}