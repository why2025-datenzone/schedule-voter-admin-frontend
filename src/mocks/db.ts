import { v4 as uuidv4 } from 'uuid';
import type { MockDB } from './types';
import { getTimestamp, DEFAULT_SOURCE_FILTER } from './types'; // ++ Import DEFAULT_SOURCE_FILTER ++

// Initial seed data
const event1Slug = "why2025-conference";
const sub1IdEvent1 = uuidv4();
const sub2IdEvent1 = uuidv4();

const event2Slug = "dev-meetup-q3";
const event2Id = uuidv4(); // Keep if used, otherwise slug is primary

export const db: MockDB = {
  can_create_events: true,
  events: {
    [event1Slug]: {
      id: uuidv4(), 
      name: "Why2025 Conference",
      slug: event1Slug,
      permissions: { view: true, configure: true, update: true, role: "admin" },
      overview: { total_voters: 150, total_sources: 2, total_submissions: 2 },
      voting_enabled: true, 
      submissions: {
        [sub1IdEvent1]: {
          code: "TALK001",
          lastupdate: getTimestamp() - 3600,
          title: "The Future of AI",
          abstract: "A talk about AI...",
          time: { start: getTimestamp() + 86400, end: getTimestamp() + 86400 + 3600, room: "Foo" },
        },
        [sub2IdEvent1]: {
          code: "TALK002",
          lastupdate: getTimestamp() - 7200,
          title: "Python Best Practices",
          abstract: "Exploring Python best practices with a lot of good example and a even more silly examples by a speaker who writes way too long abstracts and can't stop typing and types really a lot.",
        },
      },
      sources: { 
        "pretalx-main": { 
          autoupdate: true, 
          url: "http://example.com/source1", 
          eventSlug: "pretalx-slug-1", 
          interval: 1800, 
          filter: DEFAULT_SOURCE_FILTER,
          submissionTypes: {
            "1": "short talk",
            "2": "long talk",
            "3": "workshop",
          },
          typeFilter: [1, 3],
        },
        "frab-archive": { 
          autoupdate: false, 
          url: "http://example.com/source2", 
          eventSlug: "frab-slug-2", 
          interval: 300, 
          filter: "confirmed",
          submissionTypes: null,
          typeFilter: [101, 205],
        },
      },
      ratings: {
        [sub1IdEvent1]: { up: 100, down: 5, views: 200, expanded: 50 },
        [sub2IdEvent1]: { up: 80, down: 2, views: 150, expanded: 30 },
      },
      conflicts: {
        expanded: [{ a: sub1IdEvent1, b: sub2IdEvent1, correlation: 0.75 }],
        up: [{ a: sub2IdEvent1, b: sub1IdEvent1, correlation: 0.65 }],
        "expanded-without-down": [],
      },
      assignedUsers: { 
        'user1': { permissions: 'admin' },
        'user2': { permissions: 'view' },
      }
    },
    [event2Slug]: {
      id: event2Id,
      name: "Developer Meetup Q3",
      slug: event2Slug,
      permissions: { view: true, configure: false, update: false, role: "viewer" },
      overview: { total_voters: 50, total_sources: 0, total_submissions: 0 },
      voting_enabled: false, 
      submissions: {},
      sources: {}, // No sources, so no filter needed here
      ratings: {},
      conflicts: { expanded: [], up: [], "expanded-without-down": [] },
      assignedUsers: {}
    },
  },
  users: { 
    'user1': { id: 'user1', name: 'Alice Admin', email: 'alice@example.com' },
    'user2': { id: 'user2', name: 'Bob Viewer', email: 'bob@example.com' },
    'user3': { id: 'user3', name: 'Charlie Updater', email: 'charlie@example.com' },
    'user4': { id: 'user4', name: 'David Current', email: 'david@example.com' },
  },
  currentUser: { id: 'user4', name: 'David Current', email: 'david@example.com' },
};