// src/mocks/types.ts

import { EventUserPermissionSetting, SourceFilterType, DEFAULT_SOURCE_FILTER as API_DEFAULT_SOURCE_FILTER } from "@/api/types"; // ++ Import SourceFilterType ++

export interface EventListItem {
  name: string;
  slug: string;
}

export interface EventsListResponse {
  can_create: boolean;
  events: Record<string, EventListItem>; // Key is primary ID of the event
}

export interface EventCreatePayload {
  name: string;
  slug: string;
}

type EventRole = "admin" | "viewer" | "user";

export interface EventPermissions {
  view: boolean;
  configure: boolean;
  update: boolean;
  role: EventRole;
}

export interface OverviewResponse {
  total_voters: number;
  total_sources: number;
  total_submissions: number;
}

export interface SubmissionTime {
  start: number; // Unix timestamp
  end: number;   // Unix timestamp
}

export interface SubmissionItem {
  // id: string; // ID will be the key in the submissions record
  code: string;
  lastupdate: number; // Unix timestamp
  title: string;
  abstract: string;
  time?: SubmissionTime;
}

export interface SubmissionsResponse {
  submissions: Record<string, SubmissionItem>; // Key is unique submission ID (string UUID)
}

export interface SourceItemData { // Data part of the source, ID will be the key
  autoupdate: boolean;
  url: string;
  eventSlug: string;
  interval: number;
  filter: SourceFilterType; // ++ Added filter property ++
  submissionTypes: Record<string, string> | null;
  typeFilter: number[];
}

export interface EventSourcesResponse {
   sources: Record<string, SourceItemData>; // Key is source ID (string slug)
}


export interface SourceCreateUpdatePayload {
  autoupdate?: boolean;
  url?: string;
  eventSlug?: string;
  interval?: number;
  key?: string;
  apikey?: string;
  filter?: SourceFilterType; // ++ Added filter property ++
  typeFilter?: number[];
}

export interface RatingItem {
  up: number;
  down: number;
  views: number;
  expanded: number;
}

export interface EventRatingsResponse {
  ratings: Record<string, RatingItem>; // Key is submission ID
}

export interface ConflictItem {
  a: string; // Submission ID
  b: string; // Submission ID
  correlation: number;
}

export type ConflictsResponse = ConflictItem[];


export interface EventInternalData {
  id: string; // UUID
  name: string;
  slug: string;
  permissions: EventPermissions;
  overview: OverviewResponse;
  voting_enabled: boolean; // Added
  submissions: Record<string, SubmissionItem>; 
  sources: Record<string, SourceItemData>; 
  ratings: Record<string, RatingItem>; 
  conflicts: {
    expanded: ConflictItem[];
    up: ConflictItem[];
    "expanded-without-down": ConflictItem[];
  };
  assignedUsers?: Record<string, { permissions: EventUserPermissionSetting | "self" }>; 
}

export interface MockDB {
  events: Record<string, EventInternalData>; // Keyed by event slug
  can_create_events: boolean;
  // next_source_id: number; // Removed, source IDs are now slugs
  users?: Record<string, ServerUserMock>; // Optional: Global list of users, keyed by userId
  currentUser?: ServerUserMock; // Optional: Represents the currently logged-in user for "self" permission
}

// Helper function
export const getTimestamp = (): number => Math.floor(Date.now() / 1000);
export const DEFAULT_SOURCE_FILTER = API_DEFAULT_SOURCE_FILTER; // ++ Use API default ++


export interface ServerUserMock { // To avoid conflict with API type ServerUser
  id: string;
  name: string;
  email: string;
}