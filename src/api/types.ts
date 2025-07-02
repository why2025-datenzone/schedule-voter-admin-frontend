// src/api/types.ts

export type EventRole = "admin" | "viewer" | "user";

export interface EventPermissions {
  view: boolean;
  configure: boolean;
  update: boolean;
  role: EventRole;
}

export interface User {
  name: string;
  email: string;
}

export interface EventsResponse {
  can_create: boolean;
  user: User;
  events: { [id: string]: EventDetail }; // Assuming id is string, adjust if it's number
}

export interface CreateEventPayload {
  name: string;
  slug: string;
}

export interface EventOverviewResponse {
  total_voters: number;
  total_sources: number;
  total_submissions: number;
}

export interface SubmissionTime {
  start: number; // Timestamp string
  end: number;   // Timestamp string
}

export interface SubmissionDetail {
  code: string;
  lastupdate: number; // Unix timestamp
  title: string;
  abstract: string;
  time?: SubmissionTime;
}

export interface SubmissionsResponse {
  submissions: { [id: string]: SubmissionDetail };
}

// ++ Define SourceFilterType and constants ++
export const SOURCE_FILTER_TYPES = ["accepted", "confirmed"] as const;
export type SourceFilterType = typeof SOURCE_FILTER_TYPES[number];
export const DEFAULT_SOURCE_FILTER: SourceFilterType = "accepted";
// ++ End of new definitions ++

export interface SourceDetail {
  autoupdate: boolean;
  url: string;
  eventSlug: string;
  interval: number; // in seconds
  filter: SourceFilterType; // ++ Added filter property ++
}



export interface SourcesResponse {
  [id: string]: SourceDetail; // Key is source ID (string slug)
}

export interface UpdateCreateSourcePayload {
  autoupdate?: boolean;
  url?: string;
  eventSlug?: string;
  interval?: number;
  key?: string;
  apikey?: string; // Must be present if url is present
  filter?: SourceFilterType; // ++ Added filter property (optional) ++
}

// Assuming API returns the updated/created source with its ID
export interface UpdatedCreatedSourceResponse extends Partial<SourceDetail> {
    id: string; // Source ID is now a string slug
    key?: string;
    // Include other fields from SourceDetail if they are always returned
    autoupdate: boolean;
    url: string;
    interval: number;
    filter: SourceFilterType; // ++ Added filter property ++
}


export interface RatingDetail {
  up: number;
  down: number;
  views: number;
  expanded: number;
}

export interface RatingsResponse {
  [submissionId: string]: RatingDetail;
}

export type ConflictType = "expanded" | "up" | "expanded-without-down";

export interface ConflictItem {
  a: string; // submission ID
  b: string; // submission ID
  correlation: number;
}

export type ConflictsResponse = ConflictItem[];

export interface SimilarityItem {
id: string; // submission ID
metric: number;
}

export type SimilarityResponse = SimilarityItem[];

// Optional: A general error structure if your API returns structured errors
export interface ApiError {
  message: string;
  details?: any;
}

export interface SourceUpdateUrls {
  submission_update_url: string;
  // schedule_update_url: string;
}

export interface EventSourceUpdateUrlsResponse {
  [sourceId: string]: SourceUpdateUrls; // Source ID as string key
}


// --- New User Management Types ---

export type EventUserPermissionSetting = "view" | "update" | "admin";
export type EventUserDisplayPermission = EventUserPermissionSetting | "self";


export interface EventUser {
  id: string;
  name: string;
  email: string;
  permissions: EventUserDisplayPermission | null; // null if not set or for removal on POST
}

export type EventUsersResponse = EventUser[];

export interface UpdateEventUserPermissionsPayload {
  permissions: EventUserPermissionSetting | null; // "self" is not a settable permission
}

export interface ServerUser {
  id: string;
  name: string;
  email: string;
}

export type SearchUsersResponse = ServerUser[];

export interface UpdateEventDetailsPayload {
  name: string;
  voting_enabled: boolean;
}

// Modify EventDetail to include voting_enabled
export interface EventDetail {
  name: string;
  slug: string;
  permissions: EventPermissions;
  voting_enabled: boolean; // Added
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  // You could include other user details or token expiration info here if needed
}

export interface OidcExchangePayload {
  code: string;
  // redirect_uri might be sent if your backend needs to verify it,
  // but often the backend is configured with the allowed redirect_uris.
  // For this implementation, we'll assume the backend knows the redirect_uri.
  // redirect_uri?: string; 
}

// OidcExchangeResponse can be the same as LoginResponse if the backend
// returns the same token structure.
export type OidcExchangeResponse = LoginResponse;

