import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSubmissions, useRatings } from '@/api/apiService';
import { SubmissionDetail, SubmissionTime as ApiSubmissionTime } from '@/api/types';
import { useConferenceStore } from '@/store/conferenceStore';

import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
  Header,
  Column,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
    IconChevronDown, 
    IconChevronUp, 
    IconChevronsDown, 
    IconLayoutColumns, 
    IconRefresh,
    IconLoader2,
    IconAlertTriangle
} from '@tabler/icons-react';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const formatTimestamp = (timestamp: string | number | undefined): string => {
  if (timestamp === undefined || timestamp === null || String(timestamp).trim() === "") return 'N/A';
  let numericTimestamp = Number(timestamp);
  if (isNaN(numericTimestamp)) {
    const dateFromISO = new Date(String(timestamp));
    if (!isNaN(dateFromISO.getTime())) {
      return dateFromISO.toLocaleString();
    }
    return 'Invalid Date';
  }
  return new Date(numericTimestamp * 1000).toLocaleString();
};

const formatNumericDisplay = (
    value?: number, 
    precision: number = 3, 
    isPercentage: boolean = false
): string | number => {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return "-";
  }
  if (isPercentage) {
    const percentageValue = value * 100;
    const percentagePrecision = precision === 3 ? 1 : precision; 
    return `${parseFloat(percentageValue.toFixed(percentagePrecision))}%`;
  }
  if (value === 0) return 0;
  return parseFloat(value.toFixed(precision));
};

const numericSort = (rowA: Row<SubmissionRowData>, rowB: Row<SubmissionRowData>, columnId: string) => {
  let valA = rowA.getValue(columnId) as string | number | undefined;
  let valB = rowB.getValue(columnId) as string | number | undefined;

  const cleanValue = (val: string | number | undefined): number => {
    if (typeof val === 'string' && val.endsWith('%')) {
      val = parseFloat(val.slice(0, -1));
    }
    return (val === "-" || val === undefined || val === null || isNaN(Number(val))) ? -Infinity : Number(val);
  };

  const numA = cleanValue(valA);
  const numB = cleanValue(valB);
  
  if (numA < numB) return -1;
  if (numA > numB) return 1;
  return 0;
};

const createSortableHeader = (
  column: Column<SubmissionRowData, unknown>,
  headerText: string,
  tooltipText?: string,
  alignRight: boolean = false
) => {
  const buttonContent = (
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

  if (tooltipText) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent><p>{tooltipText}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return buttonContent;
};


interface SubmissionRowData extends SubmissionDetail {
  id: string;
  up?: number;
  down?: number;
  views?: number;
  expanded?: number;
}

export function Votes() {
  const { activeConference } = useConferenceStore();
  const params = useParams<{ slug?: string }>();
  const eventSlug = params.slug || activeConference?.slug;

  const { 
    data: submissionsResponse, 
    isLoading: isLoadingSubmissions, 
    isError: isErrorSubmissions, 
    error: errorSubmissions,
    refetch: refetchSubmissions
  } = useSubmissions(eventSlug, {
    enabled: !!eventSlug,
  });

  const { 
    data: ratingsData, 
    isLoading: isLoadingRatings,
    isError: isErrorRatings, 
    error: errorRatings,
    refetch: refetchRatings
  } = useRatings(eventSlug || '', {
    enabled: !!eventSlug,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'error'>('idle');


  useEffect(() => {
    let timer: number | undefined; 
    if (refreshStatus === 'error') {
      // Example: reset to idle after 5 seconds if you want automatic reset
      // timer = window.setTimeout(() => setRefreshStatus('idle'), 5000);
    }
    return () => {
        if (timer) {
            clearTimeout(timer);
        }
    };
  }, [refreshStatus]);

  const handleRefresh = async () => {
    if (!eventSlug || refreshStatus === 'refreshing') return;
    setRefreshStatus('refreshing');
    try {
      await Promise.all([
        refetchSubmissions(),
        refetchRatings(),
      ]);
      setRefreshStatus('idle');
    } catch (error) {
      console.error("Error refreshing data:", error);
      setRefreshStatus('error');
    }
  };

  const columns: ColumnDef<SubmissionRowData>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => createSortableHeader(column, "Code", undefined, true),
      cell: ({ row }) => <div className="font-medium text-right">{row.getValue("code")}</div>,
      enableSorting: true,
      size: 90,
      minSize: 60,
    },
    {
      accessorKey: "title",
      header: ({ column }) => createSortableHeader(column, "Title"),
      cell: ({ row }) => <div className="text-left line-clamp-3" title={row.getValue("title")}>{row.getValue("title")}</div>,
      enableSorting: true,
      size: 350,
      minSize: 50,
    },
    {
      accessorKey: "up",
      header: ({ column }) => createSortableHeader(column, "Up", "Up Votes", true),
      cell: ({ row }) => <div className="text-right">{formatNumericDisplay(row.original.up, 0)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 80, minSize: 50
    },
    {
      accessorKey: "down",
      header: ({ column }) => createSortableHeader(column, "Down", "Down Votes", true),
      cell: ({ row }) => <div className="text-right">{formatNumericDisplay(row.original.down, 0)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 80, minSize: 50
    },
    {
      accessorKey: "views",
      header: ({ column }) => createSortableHeader(column, "Views", undefined, true),
      cell: ({ row }) => <div className="text-right">{formatNumericDisplay(row.original.views, 0)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 90, minSize: 60
    },
    {
      accessorKey: "expanded",
      header: ({ column }) => createSortableHeader(column, "Expanded", "Expanded Views", true),
      cell: ({ row }) => <div className="text-right">{formatNumericDisplay(row.original.expanded, 0)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 100, minSize: 70
    },
    {
      id: "up_down_ratio",
      header: ({ column }) => createSortableHeader(column, "U/(U+D)", "Up / (Up + Down)", true),
      accessorFn: row => {
        const { up, down } = row;
        if (up === undefined || down === undefined) return undefined;
        const totalVotes = up + down;
        return totalVotes === 0 ? undefined : up / totalVotes;
      },
      cell: ({ getValue }) => <div className="text-right">{formatNumericDisplay(getValue<number>(), 1, true)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 100, minSize: 80
    },
    {
      id: "up_views_ratio",
      header: ({ column }) => createSortableHeader(column, "U/V", "Up / Views", true),
      accessorFn: row => (row.up === undefined || row.views === undefined || row.views === 0) ? undefined : row.up / row.views,
      cell: ({ getValue }) => <div className="text-right">{formatNumericDisplay(getValue<number>(), 1, true)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 100, minSize: 80
    },
    {
      id: "up_expanded_ratio",
      header: ({ column }) => createSortableHeader(column, "U/Ex", "Up / Expanded", true),
      accessorFn: row => (row.up === undefined || row.expanded === undefined || row.expanded === 0) ? undefined : row.up / row.expanded,
      cell: ({ getValue }) => <div className="text-right">{formatNumericDisplay(getValue<number>(), 1, true)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 100, minSize: 80
    },
    {
      id: "down_views_ratio",
      header: ({ column }) => createSortableHeader(column, "D/V", "Down / Views", true),
      accessorFn: row => (row.down === undefined || row.views === undefined || row.views === 0) ? undefined : row.down / row.views,
      cell: ({ getValue }) => <div className="text-right">{formatNumericDisplay(getValue<number>(), 1, true)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 100, minSize: 80
    },
    {
      id: "down_expanded_ratio",
      header: ({ column }) => createSortableHeader(column, "D/Ex", "Down / Expanded", true),
      accessorFn: row => (row.down === undefined || row.expanded === undefined || row.expanded === 0) ? undefined : row.down / row.expanded,
      cell: ({ getValue }) => <div className="text-right">{formatNumericDisplay(getValue<number>(), 1, true)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 100, minSize: 80
    },
    {
      id: "expanded_views_ratio",
      header: ({ column }) => createSortableHeader(column, "Ex/V", "Expanded / Views", true),
      accessorFn: row => (row.expanded === undefined || row.views === undefined || row.views === 0) ? undefined : row.expanded / row.views,
      cell: ({ getValue }) => <div className="text-right">{formatNumericDisplay(getValue<number>(), 1, true)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 100, minSize: 80
    },
    {
      id: "net_expansion_views_ratio",
      header: ({ column }) => createSortableHeader(column, "(Ex-D)/V", "(Expanded - Down) / Views", true),
      accessorFn: row => (row.expanded === undefined || row.down === undefined || row.views === undefined || row.views === 0) ? undefined : (row.expanded - row.down) / row.views,
      cell: ({ getValue }) => <div className="text-right">{formatNumericDisplay(getValue<number>(), 1, true)}</div>,
      enableSorting: true,
      sortingFn: numericSort,
      size: 110, minSize: 90
    },
    {
      accessorKey: "lastupdate",
      header: ({ column }) => createSortableHeader(column, "Last Updated"),
      cell: ({ row }) => <div className="text-sm text-muted-foreground whitespace-nowrap text-left">{formatTimestamp(row.getValue("lastupdate"))}</div>,
      enableSorting: true,
      size: 180,
      minSize: 120,
    },
    {
      id: "time",
      accessorFn: row => row.time?.start ? Number(row.time.start) : null,
      header: ({ column }) => createSortableHeader(column, "Scheduled Time"),
      cell: ({ row }) => {
        const time = row.original.time as ApiSubmissionTime | undefined;
        if (!time || !time.start || !time.end) return <span className="text-xs text-muted-foreground italic text-left">Not Scheduled</span>;
        return (
          <div className="text-xs text-muted-foreground whitespace-nowrap text-left">
            <p>Start: {formatTimestamp(time.start)}</p>
            <p>End: {formatTimestamp(time.end)}</p>
          </div>
        );
      },
      enableSorting: true,
      sortingFn: 'alphanumeric',
      size: 220,
      minSize: 150,
    },
  ], []);

  const submissionData: SubmissionRowData[] = useMemo(() => {
    if (!submissionsResponse?.submissions) return [];
    return Object.entries(submissionsResponse.submissions).map(([id, submission]) => {
      const ratingDetail = ratingsData ? ratingsData[id] : undefined;
      return {
        id,
        ...submission,
        up: ratingDetail?.up,
        down: ratingDetail?.down,
        views: ratingDetail?.views,
        expanded: ratingDetail?.expanded,
      };
    });
  }, [submissionsResponse, ratingsData]);

  const table = useReactTable({
    data: submissionData,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      rowSelection,
      columnOrder,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 50,
      size: 150,
    },
  });

  const ResizableHeader = ({ header }: { header: Header<SubmissionRowData, unknown> }) => (
    <div
      className={cn(
        "flex items-center h-full",
        header.column.getCanResize() ? 'relative' : '',
      )}
    >
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cn(
            "absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none touch-none",
            "bg-slate-300/50 dark:bg-slate-700/50 opacity-0 group-hover/tableheader:opacity-100 active:opacity-100 transition-opacity",
            header.column.getIsResizing() ? "bg-blue-500 opacity-100" : ""
          )}
        />
      )}
    </div>
  );
  
  const columnDisplayNames: Record<string, string> = {
    code: "Code",
    title: "Title",
    lastupdate: "Last Updated",
    time: "Scheduled Time",
    up: "Up Votes",
    down: "Down Votes",
    views: "Views",
    expanded: "Expanded Views",
    up_down_ratio: "U/(U+D)",
    up_views_ratio: "U/V",
    up_expanded_ratio: "U/Ex",
    down_views_ratio: "D/V",
    down_expanded_ratio: "D/Ex",
    expanded_views_ratio: "Ex/V",
    net_expansion_views_ratio: "(Ex-D)/V",
  };


  if (!eventSlug && !isLoadingSubmissions) {
    return <div className="p-6 text-center text-muted-foreground">Please select an event to view votes.</div>
  }

  const isInitiallyLoading = (isLoadingSubmissions || (eventSlug && isLoadingRatings && !submissionsResponse)) && refreshStatus !== 'refreshing';

  if (isInitiallyLoading) {
      return <div className="p-6 text-center text-lg font-medium">Loading submissions and votes data...</div>;
  }
  if (isErrorSubmissions && refreshStatus !== 'error' && !isInitiallyLoading) return <div className="p-6 text-red-600 dark:text-red-400 text-center">Error loading submissions: {errorSubmissions?.message}</div>;
  if (isErrorRatings && !ratingsData && refreshStatus !== 'error' && !isInitiallyLoading) return <div className="p-6 text-red-600 dark:text-red-400 text-center">Error loading ratings: {errorRatings?.message}</div>;


  if (!submissionsResponse || Object.keys(submissionsResponse.submissions).length === 0) {
    return <div className="p-6 text-center text-muted-foreground">No submissions found for this event.</div>;
  }

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 lg:px-6">
      <h1 className="text-2xl font-semibold mb-6 text-center sm:text-left">
        Votes: {activeConference?.name || 'Current Event'}
      </h1>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
        <Input
          placeholder="Filter submissions (code, title...)"
          value={globalFilter ?? ''}
          onChange={(event) => setGlobalFilter(String(event.target.value))}
          className="w-full sm:max-w-xs md:max-w-sm"
        />
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto shrink-0">
                <IconLayoutColumns className="mr-2 h-4 w-4" /> Columns
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {table.getAllColumns().filter(column => column.getCanHide()).map(column => (
                <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                    {columnDisplayNames[column.id] || column.id}
                </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
            </DropdownMenu>
            <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshStatus === 'refreshing' || !eventSlug}
                className={cn(
                    "w-full sm:w-auto shrink-0",
                    refreshStatus === 'error' && "border-destructive text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:text-destructive focus-visible:ring-destructive/40"
                )}
                title={refreshStatus === 'error' ? "Error refreshing data. Click to retry." : "Refresh data"}
            >
                {refreshStatus === 'refreshing' ? (
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : refreshStatus === 'error' ? (
                    <IconAlertTriangle className="mr-2 h-4 w-4" />
                ) : (
                    <IconRefresh className="mr-2 h-4 w-4" />
                )}
                Refresh
            </Button>
        </div>
      </div>

      <div className="rounded-md border shadow-sm overflow-x-auto">
        <Table style={{ width: table.getCenterTotalSize(), tableLayout: 'fixed' }}>
          <TableHeader className="bg-muted/50 dark:bg-muted/30 group/tableheader">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "whitespace-nowrap p-0 text-sm relative",
                      ['up', 'down', 'views', 'expanded', 'up_down_ratio', 'up_views_ratio', 'up_expanded_ratio', 'down_views_ratio', 'down_expanded_ratio', 'expanded_views_ratio', 'net_expansion_views_ratio', 'code'].includes(header.column.id) ? 'text-right' : 'text-left'
                    )}
                    style={{ width: header.getSize() }}
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/30 dark:hover:bg-muted/20"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'px-3 py-2 sm:px-4 sm:py-3 text-sm align-top',
                        ['up', 'down', 'views', 'expanded', 'up_down_ratio', 'up_views_ratio', 'up_expanded_ratio', 'down_views_ratio', 'down_expanded_ratio', 'expanded_views_ratio', 'net_expansion_views_ratio', 'code'].includes(cell.column.id) ? 'text-right' : 'text-left'
                      )}
                      style={{ width: cell.column.getSize() }}
                      title={typeof cell.getValue() === 'string' && cell.getValue<string>().length > 50 ? cell.getValue<string>() : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results matching your filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="py-4 text-sm text-muted-foreground text-center sm:text-left">
        Total Submissions: {table.getFilteredRowModel().rows.length}
        {(isLoadingSubmissions || isLoadingRatings) && refreshStatus !== 'refreshing' && (
          <span className="ml-2 italic">(Updating data...)</span>
        )}
      </div>
    </div>
  );
}