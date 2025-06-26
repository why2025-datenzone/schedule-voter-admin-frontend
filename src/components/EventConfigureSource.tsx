import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { produce } from 'immer';

import { useSources, updateOrCreateSource, deleteSource } from '@/api/apiService';
import type { 
    SourceDetail, 
    UpdateCreateSourcePayload, 
    UpdatedCreatedSourceResponse,
    SourceFilterType 
} from '@/api/types';
import { SOURCE_FILTER_TYPES, DEFAULT_SOURCE_FILTER } from '@/api/types';
import { useConferenceStore } from '@/store/conferenceStore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconPlus, IconTrash, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface EditableSourceUI extends SourceDetail {
  id: string;
  name: string; 
  currentUrl: string;
  currentEventSlug: string;
  currentAutoupdate: boolean;
  currentInterval: number;
  currentFilter: SourceFilterType; 
  apiKey: string; 
  _originalUrl: string;
  _originalEventSlug: string;
  _originalAutoupdate: boolean;
  _originalInterval: number;
  _originalFilter: SourceFilterType; 
  errors: Record<string, string>;
  isSaving: boolean;
  isDeleting: boolean;
}

const URL_SLUG_REGEX = /^[a-zA-Z0-9_-]+$/;
const MIN_INTERVAL = 60;
const MAX_INTERVAL = 7200;
const DEFAULT_INTERVAL = 300;

function isValidHttpUrl(string: string): boolean {
  if (!string) return true; 
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

export function EventConfigureSources() {
  const params = useParams<{ slug?: string }>();
  const { activeConference } = useConferenceStore();
  const eventSlugFromScope = params.slug || activeConference?.slug;

  const queryClient = useQueryClient();

  const { 
    data: initialApiSources, 
    isLoading: isLoadingSources, 
    isError: isErrorSources, 
    error: sourcesError,
    refetch: refetchSources,
  } = useSources(eventSlugFromScope!, {
    enabled: !!eventSlugFromScope,
    staleTime: 5 * 60 * 1000, 
  });

  const [editableSources, setEditableSources] = useState<EditableSourceUI[]>([]);
  
  const [newSourceForm, setNewSourceForm] = useState({ 
    slug: '',
    url: '',
    eventSlug: '',
    apiKey: '',
    autoupdate: false,
    interval: DEFAULT_INTERVAL,
    filter: DEFAULT_SOURCE_FILTER,
  });
  const [newSourceFormErrors, setNewSourceFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialApiSources) {
      const transformedSources: EditableSourceUI[] = Object.entries(initialApiSources).map(([idStr, detail]) => ({
        ...detail,
        id: idStr,
        name: `Source (ID: ${idStr})`,
        currentUrl: detail.url || '',
        currentEventSlug: detail.eventSlug || '',
        currentAutoupdate: detail.autoupdate,
        currentInterval: detail.interval || DEFAULT_INTERVAL,
        currentFilter: detail.filter || DEFAULT_SOURCE_FILTER, 
        apiKey: '', 
        _originalUrl: detail.url || '',
        _originalEventSlug: detail.eventSlug || '',
        _originalAutoupdate: detail.autoupdate,
        _originalInterval: detail.interval || DEFAULT_INTERVAL,
        _originalFilter: detail.filter || DEFAULT_SOURCE_FILTER, 
        errors: {},
        isSaving: false,
        isDeleting: false,
      }));
      setEditableSources(produce(transformedSources, draft => {
        draft.forEach(s => { s.errors = validateEditableSource(s); });
      }));
    } else {
      setEditableSources([]);
    }
  }, [initialApiSources]); 


  const updateSourceMutation = useMutation<
    UpdatedCreatedSourceResponse, Error,
    { eventSlug: string; sourceId: string | number; payload: UpdateCreateSourcePayload; originalSourceIdForState?: string; isNew?: boolean },
    unknown
  >({
    mutationFn: ({ eventSlug: slugFromArgs, sourceId, payload }) => 
      updateOrCreateSource(slugFromArgs, sourceId, payload),
    onSuccess: (data, variables) => {
      const sourceIdentifier = typeof variables.sourceId === 'string' && isNaN(Number(variables.sourceId)) 
                               ? `"${variables.sourceId}"` 
                               : `ID ${variables.sourceId}`;
      toast.success(`Source ${sourceIdentifier} ${variables.isNew ? 'created' : 'saved'} successfully.`);
      
      queryClient.invalidateQueries({ queryKey: ['sources', variables.eventSlug] });
      
      if (variables.isNew) {
        setNewSourceForm({ slug: '', url: '', eventSlug: '', apiKey: '', autoupdate: false, interval: DEFAULT_INTERVAL, filter: DEFAULT_SOURCE_FILTER }); 
        setNewSourceFormErrors({});
      } else {
        const idToUpdate = variables.originalSourceIdForState || (typeof data.id === 'number' ? String(data.id) : data.id);
        setEditableSources(produce(draft => {
          const source = draft.find(s => s.id === idToUpdate);
          if (source) {
            source._originalUrl = data.url || '';
            source._originalEventSlug = data.eventSlug || '';
            source._originalAutoupdate = data.autoupdate;
            source._originalInterval = data.interval;
            source._originalFilter = data.filter; 
            source.currentUrl = data.url || '';
            source.currentEventSlug = data.eventSlug || '';
            source.currentAutoupdate = data.autoupdate;
            source.currentInterval = data.interval;
            source.currentFilter = data.filter; 
            source.apiKey = '';
            source.isSaving = false;
            source.errors = validateEditableSource(source);
          }
        }));
      }
    },
    onError: (error: Error, variables) => {
      const sourceIdentifier = typeof variables.sourceId === 'string' && isNaN(Number(variables.sourceId)) 
                               ? `"${variables.sourceId}"` 
                               : `ID ${variables.sourceId}`;
      toast.error(`Failed to ${variables.isNew ? 'create' : 'save'} source ${sourceIdentifier}: ${error.message}`);
      
      if (!variables.isNew) {
        const idToUpdate = variables.originalSourceIdForState || String(variables.sourceId);
        setEditableSources(produce(draft => {
          const source = draft.find(s => s.id === idToUpdate);
          if (source) source.isSaving = false;
        }));
      }
    },
  });

  const deleteSourceMutation = useMutation<
    void, Error, { eventSlug: string; sourceId: string | number }, unknown
  >({
    mutationFn: ({ eventSlug, sourceId }) => deleteSource(eventSlug, sourceId),
    onSuccess: (_data, variables) => {
      toast.success(`Source ID ${variables.sourceId} deleted.`);
      queryClient.invalidateQueries({ queryKey: ['sources', variables.eventSlug] });
    },
    onError: (error: Error, variables) => {
      toast.error(`Failed to delete source ID ${variables.sourceId}: ${error.message}`);
      setEditableSources(produce(draft => {
        const source = draft.find(s => s.id === String(variables.sourceId));
        if (source) source.isDeleting = false;
      }));
    },
  });

  const validateEditableSource = useCallback((source: EditableSourceUI): Record<string, string> => {
    const errors: Record<string, string> = {};
    const urlChanged = source.currentUrl !== source._originalUrl;
    const eventSlugChanged = source.currentEventSlug !== source._originalEventSlug;

    if (source.currentUrl && !isValidHttpUrl(source.currentUrl)) {
      errors.url = 'Please enter a valid HTTP/HTTPS URL.';
    }
    if ((urlChanged || eventSlugChanged) && !source.apiKey) {
      errors.apiKey = 'API Key is required when URL or Event Slug is changed.';
    }
    if (source.currentAutoupdate) {
      if (!source.currentUrl && !source.currentEventSlug) {
        errors.url = 'URL or Event Slug is required for autoupdates.';
      }
      if (source.currentInterval < MIN_INTERVAL || source.currentInterval > MAX_INTERVAL) {
        errors.interval = `Interval must be between ${MIN_INTERVAL} and ${MAX_INTERVAL} seconds.`;
      }
    }
    // No specific validation for filter as it's a select
    return errors;
  }, []);
  
  const validateNewSourceForm = useCallback((form: typeof newSourceForm): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!form.slug) {
      errors.slug = 'URL Slug is required.';
    } else if (!URL_SLUG_REGEX.test(form.slug)) {
      errors.slug = 'Slug can only contain a-z, A-Z, 0-9, _, -.';
    } else {
      if (initialApiSources && initialApiSources.hasOwnProperty(form.slug)) {
        errors.slug = 'This slug is already used by an existing source.';
      }
    }

    if (form.url && !isValidHttpUrl(form.url)) {
      errors.url = 'Please enter a valid HTTP/HTTPS URL.';
    }
    if ((form.url || form.eventSlug) && !form.apiKey) {
      errors.apiKey = 'API Key is required if URL or Event Slug is provided.';
    }
    if (form.autoupdate) {
      if (!form.url && !form.eventSlug) {
        errors.url = 'URL or Event Slug is required for autoupdates.';
      } else if (!form.apiKey) {
         errors.apiKey = 'API Key is required for autoupdates with URL/Event Slug.';
      }
      if (form.interval < MIN_INTERVAL || form.interval > MAX_INTERVAL) {
        errors.interval = `Interval must be ${MIN_INTERVAL}-${MAX_INTERVAL}s.`;
      }
    }
    // No specific validation for filter
    return errors;
  }, [initialApiSources]);

  useEffect(() => {
    setNewSourceFormErrors(validateNewSourceForm(newSourceForm));
  }, [newSourceForm, validateNewSourceForm]);

  const handleEditableSourceChange = <K extends keyof EditableSourceUI>(
    id: string, 
    field: K, 
    value: EditableSourceUI[K]
  ) => {
    setEditableSources(produce(draft => {
      const source = draft.find(s => s.id === id);
      if (source) {
        (source[field] as any) = value;
        source.errors = validateEditableSource(source);
      }
    }));
  };

  const handleNewSourceFormChange = <K extends keyof typeof newSourceForm>(
    field: K, 
    value: (typeof newSourceForm)[K]
  ) => {
    setNewSourceForm(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCreateNewSource = () => {
    if (!eventSlugFromScope) return;
    const currentErrors = validateNewSourceForm(newSourceForm);
    if (Object.keys(currentErrors).length > 0) {
      setNewSourceFormErrors(currentErrors);
      toast.error('Please fix errors in the new source form before creating.');
      return;
    }

    const payload: UpdateCreateSourcePayload = {
      autoupdate: newSourceForm.autoupdate,
      interval: newSourceForm.autoupdate ? newSourceForm.interval : undefined,
      url: newSourceForm.url || undefined,
      eventSlug: newSourceForm.eventSlug || undefined,
      apikey: (newSourceForm.url || newSourceForm.eventSlug) ? newSourceForm.apiKey : undefined,
      filter: newSourceForm.filter, 
    };
    updateSourceMutation.mutate({ 
      eventSlug: eventSlugFromScope, 
      sourceId: newSourceForm.slug, 
      payload,
      isNew: true 
    });
  };

  const handleSaveIndividualSource = (sourceId: string) => {
    if (!eventSlugFromScope) return;
    const source = editableSources.find(s => s.id === sourceId);
    if (!source) return;

    const errors = validateEditableSource(source); 
    if (Object.keys(errors).length > 0) {
      setEditableSources(produce(draft => {
        const d_source = draft.find(s => s.id === sourceId);
        if(d_source) d_source.errors = errors;
      }));
      toast.error(`Source ${source.name} has validation errors.`);
      return;
    }

    const payload: UpdateCreateSourcePayload = {};
    const urlChanged = source.currentUrl !== source._originalUrl;
    const eventSlugChanged = source.currentEventSlug !== source._originalEventSlug;
    const autoupdateChanged = source.currentAutoupdate !== source._originalAutoupdate;
    const intervalChanged = source.currentInterval !== source._originalInterval;
    const filterChanged = source.currentFilter !== source._originalFilter; 

    if (urlChanged) {
        payload.url = source.currentUrl;
    }
    if (eventSlugChanged) {
        payload.eventSlug = source.currentEventSlug;
    }
    if (urlChanged || eventSlugChanged) {
        payload.apikey = source.apiKey;
    }

    if (autoupdateChanged) {
      payload.autoupdate = source.currentAutoupdate;
    }
    if (intervalChanged) {
      payload.interval = source.currentInterval;
    }
    if (filterChanged) { 
        payload.filter = source.currentFilter;
    }


    if (Object.keys(payload).length === 0) {
      toast.info(`No changes to save for ${source.name}.`);
      if (source.apiKey && !urlChanged && !eventSlugChanged) {
        setEditableSources(produce(draft => {
          const d_source = draft.find(s => s.id === sourceId);
          if (d_source) d_source.apiKey = '';
        }));
      }
      return;
    }
    
    setEditableSources(produce(draft => {
      const d_source = draft.find(s => s.id === sourceId);
      if(d_source) d_source.isSaving = true;
    }));

    const idForApi = initialApiSources && initialApiSources.hasOwnProperty(Number(source.id)) ? Number(source.id) : source.id;
    updateSourceMutation.mutate({ 
        eventSlug: eventSlugFromScope, 
        sourceId: idForApi, 
        payload, 
        originalSourceIdForState: source.id,
        isNew: false 
    });
  };

  const handleDeleteConfirmation = (sourceId: string) => {
    if (!eventSlugFromScope) return;
    const source = editableSources.find(s => s.id === sourceId);
    if (!source) return;

    setEditableSources(produce(draft => {
      const d_source = draft.find(s => s.id === sourceId);
      if(d_source) d_source.isDeleting = true;
    }));

    const idForApi = initialApiSources && initialApiSources.hasOwnProperty(Number(source.id)) ? Number(source.id) : source.id;
    deleteSourceMutation.mutate({ eventSlug: eventSlugFromScope, sourceId: idForApi });
  };


  if (!eventSlugFromScope && !isLoadingSources) {
    return <div className="p-4 text-center text-muted-foreground">Please select an event.</div>;
  }
  if (isLoadingSources) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-9 w-1/3" />
            <Skeleton className="h-10 w-24" />
        </div>
        {[1, 2].map(i => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-7 w-1/2" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  if (isErrorSources) {
    return <div className="p-4 text-red-500 text-center">Error loading sources: {sourcesError?.message}</div>;
  }
  
  const newAutoupdateCheckboxDisabled: boolean = (!newSourceForm.url && !newSourceForm.eventSlug) || ((!!newSourceForm.url || !!newSourceForm.eventSlug) && !newSourceForm.apiKey);
  const canCreateNewSource = newSourceForm.slug && Object.keys(newSourceFormErrors).length === 0 && !updateSourceMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Configure Sources: {activeConference?.name || eventSlugFromScope}
        </h1>
        <Button onClick={() => refetchSources()} variant="outline" disabled={isLoadingSources || updateSourceMutation.isPending || deleteSourceMutation.isPending}>
            <IconRefresh className={cn("mr-2 h-4 w-4", (isLoadingSources && !initialApiSources) && "animate-spin")} />
            Refresh Sources
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Existing Sources</CardTitle>
          <CardDescription>Modify settings for sources already linked to this event. Save changes per source.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {editableSources.length === 0 && <p className="text-muted-foreground">No existing sources for this event.</p>}
          {editableSources.map((source) => {
            const urlChanged = source.currentUrl !== source._originalUrl;
            const eventSlugChanged = source.currentEventSlug !== source._originalEventSlug;
            const isSourceDirty = urlChanged || 
                                  eventSlugChanged ||
                                  source.currentAutoupdate !== source._originalAutoupdate ||
                                  source.currentInterval !== source._originalInterval ||
                                  source.currentFilter !== source._originalFilter ||
                                  ((urlChanged || eventSlugChanged) && source.apiKey); 
            const isSourceValid = Object.keys(source.errors).length === 0;
            const individualSaveDisabled = !isSourceDirty || !isSourceValid || source.isSaving || updateSourceMutation.isPending;
            const existingSourceAutoupdateDisabled: boolean = (!source.currentUrl && !source.currentEventSlug) || ((urlChanged || eventSlugChanged) && !source.apiKey);
            
            return (
              <Card key={source.id} className={cn("p-4 sm:p-6", source.isSaving && "opacity-70 pointer-events-none", source.isDeleting && "opacity-50 pointer-events-none bg-destructive/10")}>
                <CardHeader className="p-0 pb-4 mb-4 border-b">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{source.name}</CardTitle>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={source.isDeleting || deleteSourceMutation.isPending || source.isSaving}>
                                <IconTrash className="mr-1.5 h-4 w-4" /> Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the source "{source.name}".
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className={buttonVariants({ variant: "destructive" })}
                                    onClick={() => handleDeleteConfirmation(source.id)}
                                >
                                    Delete Source
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="space-y-1">
                            <Label htmlFor={`url-${source.id}`}>URL</Label>
                            <Input
                            id={`url-${source.id}`}
                            value={source.currentUrl}
                            onChange={(e) => handleEditableSourceChange(source.id, 'currentUrl', e.target.value)}
                            placeholder="https://example.com/api"
                            className={cn(source.errors.url && "border-destructive")}
                            />
                            {source.errors.url && <p className="text-red-500 text-xs mt-1">{source.errors.url}</p>}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor={`eventslug-${source.id}`}>Event Slug</Label>
                            <Input
                            id={`eventslug-${source.id}`}
                            value={source.currentEventSlug}
                            onChange={(e) => handleEditableSourceChange(source.id, 'currentEventSlug', e.target.value)}
                            placeholder="e.g. my-conf-2025"
                            className={cn(source.errors.eventSlug && "border-destructive")}
                            />
                            {source.errors.eventSlug && <p className="text-red-500 text-xs mt-1">{source.errors.eventSlug}</p>}
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <Label htmlFor={`filter-${source.id}`}>Filter</Label>
                            <Select
                                value={source.currentFilter}
                                onValueChange={(value: SourceFilterType) => handleEditableSourceChange(source.id, 'currentFilter', value)}
                            >
                                <SelectTrigger id={`filter-${source.id}`} className="w-full">
                                    <SelectValue placeholder="Select filter" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SOURCE_FILTER_TYPES.map(type => (
                                        <SelectItem key={type} value={type} className="capitalize">
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(urlChanged || eventSlugChanged) && (
                            <div className="space-y-1 md:col-span-2">
                                <Label htmlFor={`apikey-${source.id}`}>API Key (Required as URL or Slug changed)</Label>
                                <Input
                                    id={`apikey-${source.id}`}
                                    type="password"
                                    value={source.apiKey}
                                    onChange={(e) => handleEditableSourceChange(source.id, 'apiKey', e.target.value)}
                                    placeholder="Enter API Key"
                                    className={cn(source.errors.apiKey && "border-destructive")}
                                />
                                {source.errors.apiKey && <p className="text-red-500 text-xs mt-1">{source.errors.apiKey}</p>}
                            </div>
                        )}
                    
                        <div className="md:col-span-2 flex items-center space-x-2 pt-2">
                            <Checkbox
                            id={`autoupdate-${source.id}`}
                            checked={source.currentAutoupdate}
                            onCheckedChange={(checked) => handleEditableSourceChange(source.id, 'currentAutoupdate', Boolean(checked))}
                            disabled={existingSourceAutoupdateDisabled}
                            />
                            <Label htmlFor={`autoupdate-${source.id}`} className={cn(existingSourceAutoupdateDisabled && "text-muted-foreground cursor-not-allowed")}>
                            Enable Autoupdates {existingSourceAutoupdateDisabled && "(URL/Slug and API Key (if changed) required)"}
                            </Label>
                        </div>

                        {source.currentAutoupdate && !existingSourceAutoupdateDisabled && (
                            <div className="space-y-1 md:col-span-2">
                                <Label htmlFor={`interval-${source.id}`}>Update Interval (seconds, {MIN_INTERVAL}-{MAX_INTERVAL})</Label>
                                <Input
                                    id={`interval-${source.id}`}
                                    type="number"
                                    value={source.currentInterval}
                                    onChange={(e) => handleEditableSourceChange(source.id, 'currentInterval', parseInt(e.target.value, 10) || DEFAULT_INTERVAL)}
                                    min={MIN_INTERVAL}
                                    max={MAX_INTERVAL}
                                    className={cn(source.errors.interval && "border-destructive")}
                                />
                                {source.errors.interval && <p className="text-red-500 text-xs mt-1">{source.errors.interval}</p>}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="p-0 pt-6 flex justify-end">
                    <Button 
                        onClick={() => handleSaveIndividualSource(source.id)} 
                        disabled={individualSaveDisabled}
                        size="sm"
                    >
                        <IconDeviceFloppy className="mr-2 h-4 w-4" />
                        {source.isSaving ? 'Saving...' : 'Save This Source'}
                    </Button>
                </CardFooter>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create New Source</CardTitle>
          <CardDescription>Define a new source and its properties. It will be saved immediately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-1">
                    <Label htmlFor="new-slug">URL Slug (Unique Identifier)</Label>
                    <Input
                    id="new-slug"
                    value={newSourceForm.slug}
                    onChange={(e) => handleNewSourceFormChange('slug', e.target.value)}
                    placeholder="e.g., my-event-source"
                    className={cn(newSourceFormErrors.slug && "border-destructive")}
                    />
                    {newSourceFormErrors.slug && <p className="text-red-500 text-xs mt-1">{newSourceFormErrors.slug}</p>}
                </div>

                <div className="space-y-1">
                    <Label htmlFor="new-url">URL (Optional)</Label>
                    <Input
                    id="new-url"
                    value={newSourceForm.url}
                    onChange={(e) => handleNewSourceFormChange('url', e.target.value)}
                    placeholder="https://example.com/api"
                    className={cn(newSourceFormErrors.url && "border-destructive")}
                    />
                    {newSourceFormErrors.url && <p className="text-red-500 text-xs mt-1">{newSourceFormErrors.url}</p>}
                </div>
                
                <div className="space-y-1">
                    <Label htmlFor="new-eventslug">Event Slug (Optional)</Label>
                    <Input
                    id="new-eventslug"
                    value={newSourceForm.eventSlug}
                    onChange={(e) => handleNewSourceFormChange('eventSlug', e.target.value)}
                    placeholder="e.g., my-conf-2025"
                    />
                </div>

                <div className="space-y-1">
                    <Label htmlFor="new-filter">Filter</Label>
                    <Select
                        value={newSourceForm.filter}
                        onValueChange={(value: SourceFilterType) => handleNewSourceFormChange('filter', value)}
                    >
                        <SelectTrigger id="new-filter" className="w-full">
                            <SelectValue placeholder="Select filter" />
                        </SelectTrigger>
                        <SelectContent>
                            {SOURCE_FILTER_TYPES.map(type => (
                                <SelectItem key={type} value={type} className="capitalize">
                                   {type.charAt(0).toUpperCase() + type.slice(1)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>


                {(newSourceForm.url || newSourceForm.eventSlug) && (
                    <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="new-apikey">API Key (Required if URL or Slug is set)</Label>
                        <Input
                            id="new-apikey"
                            type="password"
                            value={newSourceForm.apiKey}
                            onChange={(e) => handleNewSourceFormChange('apiKey', e.target.value)}
                            placeholder="Enter API Key for new source"
                            className={cn(newSourceFormErrors.apiKey && "border-destructive")}
                        />
                        {newSourceFormErrors.apiKey && <p className="text-red-500 text-xs mt-1">{newSourceFormErrors.apiKey}</p>}
                    </div>
                )}


                 <div className="md:col-span-2 flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="new-autoupdate"
                      checked={newSourceForm.autoupdate}
                      onCheckedChange={(checked) => handleNewSourceFormChange('autoupdate', Boolean(checked))}
                      disabled={newAutoupdateCheckboxDisabled}
                    />
                    <Label 
                        htmlFor="new-autoupdate" 
                        className={cn(newAutoupdateCheckboxDisabled && "text-muted-foreground cursor-not-allowed")}
                    >
                    Enable Autoupdates {newAutoupdateCheckboxDisabled && "(URL/Slug & API Key required)"}
                    </Label>
                </div>
                {newSourceForm.autoupdate && !newAutoupdateCheckboxDisabled && (
                    <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="new-interval">Update Interval (seconds, {MIN_INTERVAL}-{MAX_INTERVAL})</Label>
                    <Input
                        id="new-interval"
                        type="number"
                        value={newSourceForm.interval}
                        onChange={(e) => handleNewSourceFormChange('interval', parseInt(e.target.value, 10) || DEFAULT_INTERVAL)}
                        min={MIN_INTERVAL}
                        max={MAX_INTERVAL}
                        className={cn(newSourceFormErrors.interval && "border-destructive")}
                    />
                    {newSourceFormErrors.interval && <p className="text-red-500 text-xs mt-1">{newSourceFormErrors.interval}</p>}
                    </div>
                )}
            </div>
            <Button onClick={handleCreateNewSource} disabled={!canCreateNewSource}>
                <IconPlus className="mr-2 h-4 w-4" />
                {updateSourceMutation.isPending && updateSourceMutation.variables?.isNew ? 'Creating...' : 'Create and Save New Source'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const buttonVariants = ({ variant }: { variant: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link" | null | undefined }) => {
  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  }
  return "bg-primary text-primary-foreground hover:bg-primary/90"; 
};