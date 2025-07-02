import { useQuery, UseQueryResult, UseQueryOptions as TanstackUseQueryOptions, QueryKey } from '@tanstack/react-query';
import {
  EventsResponse,
  CreateEventPayload,
  EventOverviewResponse,
  SubmissionsResponse,
  SourcesResponse,
  UpdateCreateSourcePayload,
  UpdatedCreatedSourceResponse,
  RatingsResponse,
  ConflictType,
  ConflictsResponse,
  EventSourceUpdateUrlsResponse,
  EventUsersResponse,
  SearchUsersResponse,
  UpdateEventUserPermissionsPayload,
  UpdateEventDetailsPayload,
  LoginPayload,
  LoginResponse,
  OidcExchangePayload,
  OidcExchangeResponse,
  SimilarityResponse,
} from './types';
import { handleApiUnauthorized } from '@/store/authStore';
import { getApiBaseUrl } from '@/config/appConfig';

const getToken = (): string | null => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token ?? null;
    }
  } catch (e) {
    console.error("Failed to parse auth token from localStorage", e);
  }
  return null;
};

async function handleResponse<T>(response: Response): Promise<T> {
  const API_BASE_URL = getApiBaseUrl();
  if (response.status === 401) {
    const isLoginOrExchange = response.url.endsWith(`${API_BASE_URL}/login`) || response.url.endsWith(`${API_BASE_URL}/exchange`);
    if (!isLoginOrExchange) {
      handleApiUnauthorized();
      throw new Error('Unauthorized. Session expired or invalid. Please login again.');
    }
  }
  if (!response.ok) {
    let errorPayload;
    try {
      errorPayload = await response.json();
    } catch (e) {
      errorPayload = { message: `Request failed with status ${response.status} and no JSON body (${response.statusText})` };
    }
    const errorMessage = errorPayload?.message ?? errorPayload?.detail ?? `API Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return response.json() as Promise<T>;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const API_BASE_URL = getApiBaseUrl();
  const token = getToken();
  const headers = new Headers(options.headers || {});

  const isLoginOrExchange = url.endsWith(`${API_BASE_URL}/login`) || url.endsWith(`${API_BASE_URL}/exchange`);
  if (token && !isLoginOrExchange) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.append('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
}

export async function createEvent(payload: CreateEventPayload): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetchWithAuth(`${API_BASE_URL}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse<void>(response);
}

export async function updateEventDetails(
  eventSlug: string,
  payload: UpdateEventDetailsPayload
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetchWithAuth(`${API_BASE_URL}/events/${eventSlug}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse<void>(response);
}

export async function updateOrCreateSource(
  eventSlug: string,
  sourceId: string | number,
  payload: UpdateCreateSourcePayload
): Promise<UpdatedCreatedSourceResponse> {
  const API_BASE_URL = getApiBaseUrl();
  if (payload.url && payload.apikey === undefined) {
    throw new Error("API key (apikey) must be present if URL is provided for a source.");
  }
  if (sourceId === undefined || sourceId === null || String(sourceId).trim() === '') {
    throw new Error("sourceId must be provided by the application.");
  }
  const url = `${API_BASE_URL}/sources/${eventSlug}/${sourceId}`;
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse<UpdatedCreatedSourceResponse>(response);
}

export async function deleteSource(
  eventSlug: string,
  sourceId: string | number
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const url = `${API_BASE_URL}/sources/${eventSlug}/${sourceId}`;
  const response = await fetchWithAuth(url, {
    method: 'DELETE',
  });
  if (response.status === 204) {
    return Promise.resolve();
  }
  return handleResponse<void>(response);
}

export async function updateEventUserPermissions(
  eventSlug: string,
  userId: string,
  payload: UpdateEventUserPermissionsPayload
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetchWithAuth(`${API_BASE_URL}/users/${eventSlug}/${userId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse<void>(response);
}

export type HookOptions<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> = Omit<
  TanstackUseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'queryKey' | 'queryFn'
>;

export function useSimilarSubmissions(
  eventSlug: string,
  submissionId: string,
  conflictType: ConflictType,
  count: number,
  options?: HookOptions<SimilarityResponse, Error, SimilarityResponse, ['similarities', string, string, ConflictType, number]>
): UseQueryResult<SimilarityResponse, Error> {
  return useQuery<SimilarityResponse, Error, SimilarityResponse, ['similarities', string, string, ConflictType, number]>({
    queryKey: ['similarities', eventSlug, submissionId, conflictType, count],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/similarities/${eventSlug}/${encodeURIComponent(submissionId)}/${conflictType}/${count}`);
      return handleResponse<SimilarityResponse>(response);
    },
    enabled: !!eventSlug && !!submissionId && !!conflictType && count > 0,
    ...options,
  });
}

export function useEvents<TSelectedData = EventsResponse>(
  options?: HookOptions<EventsResponse, Error, TSelectedData, ['events']>
): UseQueryResult<TSelectedData, Error> {
  return useQuery<EventsResponse, Error, TSelectedData, ['events']>({
    queryKey: ['events'],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/events`);
      return handleResponse<EventsResponse>(response);
    },
    ...options,
  });
}

export function useEventOverview(
  eventSlug: string | undefined,
  options?: HookOptions<EventOverviewResponse, Error, EventOverviewResponse, ['overview', string | undefined]>
): UseQueryResult<EventOverviewResponse, Error> {
  return useQuery({
    queryKey: ['overview', eventSlug],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/overview/${eventSlug}`);
      return handleResponse<EventOverviewResponse>(response);
    },
    enabled: !!eventSlug,
    ...options,
  });
}

export function useSubmissions(
  eventSlug: string | undefined,
  options?: HookOptions<SubmissionsResponse, Error, SubmissionsResponse, ['submissions', string | undefined]>
): UseQueryResult<SubmissionsResponse, Error> {
  return useQuery({
    queryKey: ['submissions', eventSlug],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/submissions/${eventSlug}`);
      return handleResponse<SubmissionsResponse>(response);
    },
    enabled: !!eventSlug,
    ...options,
  });
}

export function useSources(
  eventSlug: string,
  options?: HookOptions<SourcesResponse, Error, SourcesResponse, ['sources', string]>
): UseQueryResult<SourcesResponse, Error> {
  return useQuery<SourcesResponse, Error, SourcesResponse, ['sources', string]>({
    queryKey: ['sources', eventSlug],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/sources/${eventSlug}`);
      return handleResponse<SourcesResponse>(response);
    },
    enabled: !!eventSlug,
    ...options,
  });
}

export function useRatings(
  eventSlug: string,
  options?: HookOptions<RatingsResponse, Error, RatingsResponse, ['ratings', string]>
): UseQueryResult<RatingsResponse, Error> {
  return useQuery<RatingsResponse, Error, RatingsResponse, ['ratings', string]>({
    queryKey: ['ratings', eventSlug],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/ratings/${eventSlug}`);
      return handleResponse<RatingsResponse>(response);
    },
    enabled: !!eventSlug,
    ...options,
  });
}

export function useConflicts(
  eventSlug: string,
  conflictType: ConflictType,
  count: number,
  options?: HookOptions<ConflictsResponse, Error, ConflictsResponse, ['conflicts', string, ConflictType, number]>
): UseQueryResult<ConflictsResponse, Error> {
  return useQuery<ConflictsResponse, Error, ConflictsResponse, ['conflicts', string, ConflictType, number]>({
    queryKey: ['conflicts', eventSlug, conflictType, count],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/conflicts/${eventSlug}/${conflictType}/${count}`);
      return handleResponse<ConflictsResponse>(response);
    },
    enabled: !!eventSlug && !!conflictType && count > 0,
    ...options,
  });
}

export function useEventSourceUpdateUrls(
  eventSlug: string | undefined,
  options?: HookOptions<EventSourceUpdateUrlsResponse, Error, EventSourceUpdateUrlsResponse, ['eventSourceUpdateUrls', string | undefined]>
): UseQueryResult<EventSourceUpdateUrlsResponse, Error> {
  return useQuery<
    EventSourceUpdateUrlsResponse,
    Error,
    EventSourceUpdateUrlsResponse,
    ['eventSourceUpdateUrls', string | undefined]
  >({
    queryKey: ['eventSourceUpdateUrls', eventSlug],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/urls/${eventSlug}`);
      return handleResponse<EventSourceUpdateUrlsResponse>(response);
    },
    enabled: !!eventSlug,
    ...options,
  });
}

export function useEventUsers(
  eventSlug: string | undefined,
  options?: HookOptions<EventUsersResponse, Error, EventUsersResponse, ['eventUsers', string | undefined]>
): UseQueryResult<EventUsersResponse, Error> {
  return useQuery<
    EventUsersResponse,
    Error,
    EventUsersResponse,
    ['eventUsers', string | undefined]
  >({
    queryKey: ['eventUsers', eventSlug],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/users/${eventSlug}`);
      return handleResponse<EventUsersResponse>(response);
    },
    enabled: !!eventSlug,
    ...options,
  });
}

export function useSearchUsers(
  eventSlug: string | undefined,
  query: string,
  count: number,
  options?: HookOptions<SearchUsersResponse, Error, SearchUsersResponse, ['searchUsers', string | undefined, string, number]>
): UseQueryResult<SearchUsersResponse, Error> {
  return useQuery<
    SearchUsersResponse,
    Error,
    SearchUsersResponse,
    ['searchUsers', string | undefined, string, number]
  >({
    queryKey: ['searchUsers', eventSlug, query, count],
    queryFn: async () => {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetchWithAuth(`${API_BASE_URL}/usersearch/${eventSlug}?q=${encodeURIComponent(query)}&n=${count}`);
      return handleResponse<SearchUsersResponse>(response);
    },
    enabled: !!eventSlug && !!query && count > 0,
    ...options,
  });
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetchWithAuth(`${API_BASE_URL}/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse<LoginResponse>(response);
}

export async function exchangeOidcCode(payload: OidcExchangePayload): Promise<OidcExchangeResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetchWithAuth(`${API_BASE_URL}/exchange`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse<OidcExchangeResponse>(response);
}