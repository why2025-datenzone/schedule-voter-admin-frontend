import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  useEventUsers,
  updateEventUserPermissions,
  useSearchUsers,
} from '@/api/apiService';
import type {
  UpdateEventUserPermissionsPayload,
  EventUserPermissionSetting,
  ServerUser,
} from '@/api/types';
import { useConferenceStore } from '@/store/conferenceStore';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  IconTrash,
  IconUserPlus,
  IconSearch,
  IconRefresh,
  IconAlertTriangle,
  IconLoader2,
  IconUsersGroup, 
  IconX,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const PERMISSION_LEVELS: EventUserPermissionSetting[] = ["view", "update", "admin"];
const ADD_USER_DEFAULT_PERMISSION: EventUserPermissionSetting = "view";
const SEARCH_USER_COUNT = 5;

export function EventUserManagement() {
  const { slug: slugFromParams } = useParams<{ slug?: string }>();
  const { activeConference } = useConferenceStore();
  const queryClient = useQueryClient();

  const eventSlug = slugFromParams || activeConference?.slug;

  const {
    data: eventUsersData,
    isLoading: isLoadingEventUsers,
    isError: isErrorEventUsers,
    error: eventUsersError,
    refetch: refetchEventUsers,
  } = useEventUsers(eventSlug, {
    enabled: !!eventSlug,
  });

  const updateUserMutation = useMutation<
    void,
    Error,
    { userId: string; payload: UpdateEventUserPermissionsPayload, isAdding?: boolean, userNameToDisplay?: string }
  >({
    mutationFn: ({ userId, payload }) =>
      updateEventUserPermissions(eventSlug!, userId, payload),
    onSuccess: (_data, variables) => {
      const userName = variables.userNameToDisplay || variables.userId;
      toast.success(
        variables.isAdding
        ? `User "${userName}" added as ${variables.payload.permissions}.`
        : variables.payload.permissions === null
        ? `User "${userName}" removed.`
        : `Permissions updated for "${userName}".`
      );
      queryClient.invalidateQueries({ queryKey: ['eventUsers', eventSlug] });
      if (variables.isAdding) {
        setSearchInput('');
      }
    },
    onError: (error, variables) => {
      const userName = variables.userNameToDisplay || variables.userId;
      toast.error(
        variables.isAdding
        ? `Failed to add user "${userName}": ${error.message}`
        : variables.payload.permissions === null
        ? `Failed to remove user "${userName}": ${error.message}`
        : `Failed to update permissions for "${userName}": ${error.message}`
      );
    },
  });

  const handlePermissionChange = (userId: string, newPermission: EventUserPermissionSetting, userName: string) => {
    if (!eventSlug) return;
    updateUserMutation.mutate({ userId, payload: { permissions: newPermission }, userNameToDisplay: userName });
  };

  const handleRemoveUser = (userId: string, userName: string) => {
    if (!eventSlug) return;
    updateUserMutation.mutate({ userId, payload: { permissions: null }, userNameToDisplay: userName });
  };

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchInput = useDebounce(searchInput.trim(), 300);

  const {
    data: searchResultsData,
    isLoading: isLoadingSearchResults,
    isFetching: isFetchingSearchResults,
    isError: isErrorSearchResults,
    error: searchResultsError,
  } = useSearchUsers(eventSlug, debouncedSearchInput, SEARCH_USER_COUNT, {
    enabled: !!eventSlug && debouncedSearchInput.length > 1,
  });
  
  const handleAddUser = (userToAdd: ServerUser) => {
    if (!eventSlug) return;
    updateUserMutation.mutate({
      userId: userToAdd.id,
      payload: { permissions: ADD_USER_DEFAULT_PERMISSION },
      isAdding: true,
      userNameToDisplay: userToAdd.name
    });
  };

  const filteredAndSortedEventUsers = useMemo(() => {
    if (!eventUsersData) return [];
    return [...eventUsersData].sort((a, b) => {
      if (a.permissions === 'self') return -1; 
      if (b.permissions === 'self') return 1;
      return a.name.localeCompare(b.name); 
    });
  }, [eventUsersData]);

  const filteredSearchResults = useMemo(() => {
    if (!searchResultsData) return [];
    const eventUserIds = eventUsersData?.map(u => u.id) || [];
    return searchResultsData.filter(searchedUser => !eventUserIds.includes(searchedUser.id));
  }, [searchResultsData, eventUsersData]);

  const canManageUsers = activeConference?.permissions.configure === true || activeConference?.permissions.role === 'admin';

  if (!eventSlug) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please select an event to manage users.
      </div>
    );
  }

  if (isLoadingEventUsers && !eventUsersData) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <Skeleton className="h-8 w-3/4 mb-4 md:w-1/2" />
        <Card>
          <CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader>
          <CardContent><Skeleton className="h-10 w-full" /></CardContent>
        </Card>
      </div>
    );
  }
  
  if (isErrorEventUsers) {
    return (
      <div className="p-6 text-destructive text-center">
        <IconAlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <p>Error loading event users: {eventUsersError?.message || "Unknown error"}</p>
        <Button onClick={() => refetchEventUsers()} variant="outline" className="mt-4">
            <IconRefresh className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center">
          <IconUsersGroup className="mr-3 h-7 w-7" />
          Manage Users for {activeConference?.name || eventSlug}
        </h1>
        <Button onClick={() => refetchEventUsers()} variant="outline" disabled={isLoadingEventUsers || updateUserMutation.isPending}>
            <IconRefresh className={cn("mr-2 h-4 w-4", (isLoadingEventUsers && !eventUsersData) && "animate-spin")} />
            Refresh Users
        </Button>
      </div>

      {!canManageUsers && (
        <Card className="border-orange-500/50 bg-orange-500/10 dark:bg-orange-900/20">
            <CardHeader>
                <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center">
                    <IconAlertTriangle className="mr-2 h-5 w-5" />
                    Permission Denied
                </CardTitle>
            </CardHeader>
            <CardContent className="text-orange-600 dark:text-orange-300">
                You do not have sufficient permissions to manage users for this event.
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Event Users</CardTitle>
          <CardDescription>
            Users assigned to this event. You cannot modify your own permissions or remove yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredAndSortedEventUsers && filteredAndSortedEventUsers.length > 0 ? (
            filteredAndSortedEventUsers.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-3 hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3 flex-grow min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="truncate">
                    <p className="font-semibold truncate">{user.name} {user.permissions === 'self' && <Badge variant="outline" className="ml-1.5 text-xs">You</Badge>}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:ml-auto mt-2 sm:mt-0 w-full sm:w-auto flex-shrink-0">
                  {user.permissions !== 'self' && canManageUsers && (
                    <>
                      <ToggleGroup
                        type="single"
                        value={user.permissions as EventUserPermissionSetting | undefined}
                        onValueChange={(newPermission) => {
                          if (newPermission && PERMISSION_LEVELS.includes(newPermission as EventUserPermissionSetting)) {
                            handlePermissionChange(user.id, newPermission as EventUserPermissionSetting, user.name);
                          }
                        }}
                        className="flex-wrap justify-start sm:justify-end"
                        disabled={updateUserMutation.isPending && updateUserMutation.variables?.userId === user.id}
                        aria-label={`Permissions for ${user.name}`}
                      >
                        {PERMISSION_LEVELS.map(perm => (
                          <ToggleGroupItem key={perm} value={perm} aria-label={perm} className="capitalize text-xs px-2 py-1 h-auto sm:px-2.5 sm:py-1.5">
                            {perm}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground" disabled={updateUserMutation.isPending && updateUserMutation.variables?.userId === user.id && updateUserMutation.variables?.payload.permissions === null} title={`Remove ${user.name}`}>
                            {(updateUserMutation.isPending && updateUserMutation.variables?.userId === user.id && updateUserMutation.variables?.payload.permissions === null)
                                ? <IconLoader2 className="h-4 w-4 animate-spin" /> 
                                : <IconTrash className="h-4 w-4" />}
                             <span className="sr-only">Remove User</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "{user.name}" ({user.email}) from this event?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className={cn(buttonVariants({ variant: "destructive" }))}
                              onClick={() => handleRemoveUser(user.id, user.name)}
                            >
                              Remove User
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                   {user.permissions === 'self' && <Badge variant="secondary" className="whitespace-nowrap text-sm py-1 px-2.5">Own Account</Badge>}
                   {user.permissions !== 'self' && !canManageUsers && <Badge variant="outline" className="whitespace-nowrap capitalize text-sm py-1 px-2.5">{user.permissions || 'No Permissions'}</Badge>}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground p-3 text-center">No users are assigned to this event.</p>
          )}
        </CardContent>
      </Card>

      {canManageUsers && (
        <Card>
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
            <CardDescription>Search for users by name or email and add them to the event with 'view' permission.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <IconSearch className="h-5 w-5 text-muted-foreground shrink-0" />
              <Input
                type="search"
                placeholder="Search users to add (min. 2 characters)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-grow"
              />
              {searchInput && (
                 <Button variant="ghost" size="icon" onClick={() => setSearchInput('')} className="text-muted-foreground hover:text-foreground" title="Clear search">
                    <IconX className="h-4 w-4" />
                 </Button>
              )}
            </div>

            {(isLoadingSearchResults || (isFetchingSearchResults && debouncedSearchInput.length > 1)) && (
              <div className="space-y-2 pt-2">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            )}
            
            {isErrorSearchResults && debouncedSearchInput.length > 1 && (
                 <div className="text-destructive p-3 border border-destructive/50 rounded-md bg-destructive/10 dark:bg-destructive/20 flex items-center text-sm">
                    <IconAlertTriangle className="inline-block mr-2 h-5 w-5 shrink-0" />
                    Error searching users: {searchResultsError?.message || "Unknown error"}
                </div>
            )}

            {!isLoadingSearchResults && !isFetchingSearchResults && debouncedSearchInput.length > 1 && filteredSearchResults.length === 0 && searchResultsData && (
                 <p className="text-muted-foreground text-sm pt-2 p-3">No new users found matching "{debouncedSearchInput}".</p>
            )}

            {filteredSearchResults.length > 0 && (
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium px-3">Search Results:</Label>
                {filteredSearchResults.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-3 hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors">
                     <div className="flex items-center gap-3 flex-grow min-w-0">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                            <p className="font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleAddUser(user)}
                        disabled={updateUserMutation.isPending && updateUserMutation.variables?.userId === user.id && updateUserMutation.variables?.isAdding}
                        className="mt-2 sm:mt-0 w-full sm:w-auto flex-shrink-0"
                    >
                      {(updateUserMutation.isPending && updateUserMutation.variables?.userId === user.id && updateUserMutation.variables?.isAdding)
                        ? <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" /> 
                        : <IconUserPlus className="mr-1.5 h-4 w-4" />}
                      Add as {ADD_USER_DEFAULT_PERMISSION}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}