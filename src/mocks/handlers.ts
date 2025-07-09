import { http, HttpResponse } from 'msw';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import {
  EventsResponse,
  EventDetail,
  CreateEventPayload,
  UpdateEventDetailsPayload, 
  UpdateCreateSourcePayload,
  UpdatedCreatedSourceResponse,
  EventSourceUpdateUrlsResponse,
  SourcesResponse,
  EventUser,
  EventUsersResponse,
  SearchUsersResponse,
  UpdateEventUserPermissionsPayload,
  EventUserPermissionSetting,
  LoginPayload, 
  LoginResponse, 
  DEFAULT_SOURCE_FILTER,
  OidcExchangeResponse,
  OidcExchangePayload,
  SimilarityResponse, // ++ Import DEFAULT_SOURCE_FILTER ++
} from '../api/types'; 
import type {
  EventInternalData,
  SubmissionsResponse as MockSubmissionsResponse,
  MockDB,
  SourceItemData, // ++ Import SourceItemData ++
} from './types'; 


// Helper to get a an event or return 404
function getEventOr404(eventSlug: string | readonly string[] | undefined, dbInstance: MockDB): EventInternalData | HttpResponse<{message: string}> {
  const slugStr = String(eventSlug);
  if (!slugStr) {
    return HttpResponse.json({ message: 'Event slug is required.' }, { status: 400 });
  }
  const event = dbInstance.events[slugStr];
  if (!event) {
    return HttpResponse.json({ message: `Event "${slugStr}" not found.` }, { status: 404 });
  }
  return event;
}

// Sample users (if not already present from previous steps)
if (!db.users) {
  db.users = {
    'user1': { id: 'user1', name: 'Alice Admin', email: 'alice@example.com' },
    'user2': { id: 'user2', name: 'Bob Viewer', email: 'bob@example.com' },
    'user3': { id: 'user3', name: 'Charlie Updater', email: 'charlie@example.com' },
    'user4': { id: 'user4', name: 'David Current', email: 'david@example.com' },
    'user5': { id: 'user5', name: 'Eve Editor', email: 'eve@example.com' },
    'user6': { id: 'user6', name: 'Frank Finder', email: 'frank@example.com' },
    'user7': { id: 'user7', name: 'Grace Guest', email: 'grace@example.com' },
  };
  db.currentUser = db.users['user4'];
}

export const handlers = [
  http.post('/api/login', async ({ request }) => {
    const payload = await request.json() as LoginPayload;

    if (!payload.username || !payload.password) {
      return HttpResponse.json({ message: 'Username and password are required.' }, { status: 400 });
    }

    // Mock credentials check
    if (payload.username === 'testuser' && payload.password === 'password123') {
      const response: LoginResponse = {
        token: `mock-jwt-token-for-${payload.username}-${Date.now()}`,
      };
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return HttpResponse.json(response, { status: 200 });
    } else if (payload.username === 'admin@localhost.com' && payload.password === 'adminpass') {
        const response: LoginResponse = {
            token: `mock-admin-jwt-token-for-${payload.username}-${Date.now()}`,
        };
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
        return HttpResponse.json(response, { status: 200 });
    } else {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return HttpResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }
  }),

  // --- Event Handlers ---
  http.get('/api/events', () => {
    const eventsForResponse: { [id: string]: EventDetail } = {};
    for (const slug in db.events) {
      const event = db.events[slug];
      eventsForResponse[event.id] = { 
        name: event.name,
        slug: event.slug,
        permissions: event.permissions,
        voting_enabled: event.voting_enabled, 
      };
    }
    const response: EventsResponse = {
      can_create: db.can_create_events,
      user: {"name": "Foo", "email": "bar@foo@com"},
      events: eventsForResponse,
    };
    return HttpResponse.json(response);
  }),

  http.post('/api/events', async ({ request }) => {
    if (!db.can_create_events) {
      return HttpResponse.json({ message: 'User does not have permission to create events.' }, { status: 403 });
    }
    const payload = (await request.json()) as CreateEventPayload;
    if (!payload.name || !payload.slug) {
      return HttpResponse.json({ message: 'Name and slug are required.' }, { status: 400 });
    }
    if (db.events[payload.slug]) {
      return HttpResponse.json({ message: `Event with slug "${payload.slug}" already exists.` }, { status: 409 });
    }
    const newEventId = uuidv4();
    const newEvent: EventInternalData = {
      id: newEventId,
      name: payload.name,
      slug: payload.slug,
      permissions: { view: true, configure: true, update: true, role: "admin" },
      overview: { total_voters: 0, total_sources: 0, total_submissions: 0 },
      voting_enabled: true, 
      submissions: {},
      sources: {},
      ratings: {},
      conflicts: { expanded: [], up: [], "expanded-without-down": [] },
      assignedUsers: {},
    };
    db.events[payload.slug] = newEvent;
    const response: EventDetail = {
      name: newEvent.name,
      slug: newEvent.slug,
      permissions: newEvent.permissions,
      voting_enabled: newEvent.voting_enabled, 
    };
    return HttpResponse.json(response, { status: 201 });
  }),

  http.post('/api/events/:eventSlug', async ({ request, params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    if (!event.permissions.configure) {
        return HttpResponse.json({ message: 'Forbidden: You do not have permission to configure this event.' }, { status: 403 });
    }

    const payload = await request.json() as UpdateEventDetailsPayload;

    if (typeof payload.name === 'string') {
        event.name = payload.name;
    }
    if (typeof payload.voting_enabled === 'boolean') {
        event.voting_enabled = payload.voting_enabled;
    }

    return HttpResponse.json("success", { status: 200 });
  }),

  http.get('/api/overview/:eventSlug', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    return HttpResponse.json(eventOrError.overview);
  }),

  // http.get('/api/event/:eventSlug', ({ params }) => {
  //   const eventOrError = getEventOr404(params.eventSlug, db);
  //   if (eventOrError instanceof HttpResponse) return eventOrError;
  //   const event = eventOrError;
  //   const response: EventDataResponse = {
  //       name: event.name,
  //       slug: event.slug,
  //       permissions: event.permissions,
  //       role: event.permissions.role,
  //       view: event.permissions.view,
  //       configure: event.permissions.configure,
  //       update: event.permissions.update,
  //       voting_enabled: event.voting_enabled, 
  //   };
  //   return HttpResponse.json(response);
  // }),

  http.get('/api/submissions/:eventSlug', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;
    const response: MockSubmissionsResponse = {
        submissions: event.submissions
    };
    return HttpResponse.json(response);
  }),

  // ++ GET /api/sources/:eventSlug - Ensure filter is returned ++
  http.get('/api/sources/:eventSlug', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    // Transform SourceItemData to SourceDetail for the response
    const responseSources: SourcesResponse = {};
    for (const sourceId in event.sources) {
      const internalSource = event.sources[sourceId];
      responseSources[sourceId] = {
        autoupdate: internalSource.autoupdate,
        url: internalSource.url,
        eventSlug: internalSource.eventSlug,
        interval: internalSource.interval,
        filter: internalSource.filter || DEFAULT_SOURCE_FILTER, // Ensure filter is present, default if not
        submissionTypes: internalSource.submissionTypes,
        typeFilter: internalSource.typeFilter,
      };
    }
    return HttpResponse.json(responseSources);
  }),

  // ++ POST /api/sources/:eventSlug/:sourceId - Handle filter ++
  http.post('/api/sources/:eventSlug/:sourceId', async ({ request, params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    const { sourceId: pathSourceId } = params;
    const payload = await request.json() as UpdateCreateSourcePayload;

    if ((payload.url || payload.eventSlug) && payload.apikey === undefined) {
      return HttpResponse.json({ message: "API key (apikey) must be present if URL or Event Slug is provided." }, { status: 400 });
    }
    const sourceId = String(pathSourceId);
    let httpStatus = 200;

    if (event.sources[sourceId]) { // Existing source
      const existingSource = event.sources[sourceId];
      event.sources[sourceId] = {
        ...existingSource,
        ...(payload.autoupdate !== undefined && { autoupdate: payload.autoupdate }),
        ...(payload.url !== undefined && { url: payload.url }),
        ...(payload.eventSlug !== undefined && { eventSlug: payload.eventSlug }),
        ...(payload.interval !== undefined && { interval: payload.interval }),
        ...(payload.filter !== undefined && { filter: payload.filter }),
        ...(payload.typeFilter !== undefined && { typeFilter: payload.typeFilter }),
      };
    } else { // New source
      event.sources[sourceId] = {
        autoupdate: payload.autoupdate ?? false,
        url: payload.url ?? '',
        eventSlug: payload.eventSlug ?? '',
        interval: payload.interval ?? 300,
        filter: payload.filter ?? DEFAULT_SOURCE_FILTER,
        submissionTypes: null, // New sources are created without predefined submission types
        typeFilter: payload.typeFilter ?? [],
      };
      httpStatus = 201;
      event.overview.total_sources = (event.overview.total_sources ?? 0) + 1;
    }
    const responseData: SourceItemData = event.sources[sourceId]; // This is SourceItemData from mock
    const response: UpdatedCreatedSourceResponse = { // This is the API response type
      id: sourceId,
      autoupdate: responseData.autoupdate,
      url: responseData.url,
      eventSlug: responseData.eventSlug,
      interval: responseData.interval,
      filter: responseData.filter,
      submissionTypes: responseData.submissionTypes,
      typeFilter: responseData.typeFilter,
      ...(payload.key && { key: payload.key }),
    };
    return HttpResponse.json(response, { status: httpStatus });
  }),

  http.delete('/api/sources/:eventSlug/:sourceId', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    const { sourceId: pathSourceId } = params;
    const sourceIdToDelete = String(pathSourceId);

    if (event.sources.hasOwnProperty(sourceIdToDelete)) {
      delete event.sources[sourceIdToDelete];
      event.overview.total_sources = Math.max(0, (event.overview.total_sources ?? 0) - 1);
      return new HttpResponse(null, { status: 204 }); 
    } else {
      return HttpResponse.json({ message: `Source with ID/slug "${sourceIdToDelete}" not found in event "${String(params.eventSlug)}".` }, { status: 404 });
    }
  }),

  http.get('/api/ratings/:eventSlug', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    return HttpResponse.json(eventOrError.ratings);
  }),

  http.get('/api/conflicts/:eventSlug/:type/:n', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    const { type, n } = params;
    const conflictType = type as keyof EventInternalData['conflicts'];
    const count = parseInt(n as string, 10);

    if (!event.conflicts[conflictType]) {
      return HttpResponse.json({ message: `Conflict type "${String(conflictType)}" not found.` }, { status: 400 });
    }
    const conflicts = event.conflicts[conflictType].slice(0, count);
    return HttpResponse.json(conflicts);
  }),

  http.get('/api/similarities/:eventSlug/:submissionId/:type/:n', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    const { submissionId, n } = params;
    const count = parseInt(n as string, 10);

    const allSubmissionIds = Object.keys(event.submissions);
    // Filter out the submissionId we are getting similarities for
    const otherSubmissions = allSubmissionIds.filter(id => id !== submissionId);

    if (otherSubmissions.length === 0) {
        return HttpResponse.json<SimilarityResponse>([]);
    }
    
    // Create a deterministic-ish but varied list for mocking
    const shuffled = [...otherSubmissions].sort((a, b) => {
        const hashA = a.charCodeAt(0) + a.charCodeAt(3);
        const hashB = b.charCodeAt(0) + b.charCodeAt(3);
        return (hashA % 10) - (hashB % 10);
    });

    const similarSubmissions: SimilarityResponse = shuffled
        .slice(0, count)
        .map(id => ({
            id,
            metric: Math.random() * 0.4 + 0.55 // a metric between 0.55 and 0.95
        }))
        .sort((a, b) => b.metric - a.metric);

    return HttpResponse.json(similarSubmissions);
  }),

  http.get('/api/urls/:eventSlug', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    if (!event.sources || Object.keys(event.sources).length === 0) {
      return HttpResponse.json({});
    }
    const response: EventSourceUpdateUrlsResponse = {};
    for (const sourceIdKey in event.sources) {
        response[sourceIdKey] = {
          submission_update_url: `/api/sources/${String(params.eventSlug)}/${sourceIdKey}/submissions`,
          // schedule_update_url: `/api/sources/${String(params.eventSlug)}/${sourceIdKey}/schedule`,
        };
    }
    return HttpResponse.json(response);
  }),
  
   http.get('/api/users/:eventSlug', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    if (!event.assignedUsers) {
      event.assignedUsers = {
        'user1': { permissions: 'admin' },
        'user2': { permissions: 'view' },
        'user4': { permissions: 'self' }, 
      };
    }
    const response: EventUsersResponse = Object.entries(event.assignedUsers).map(([userId, rawAssignment]) => {
      const assignment = rawAssignment as { permissions: EventUserPermissionSetting | "self" };
      const userDetail = db.users![userId];
      const displayPermission = (db.currentUser?.id === userId && assignment.permissions === 'self')
                                ? 'self'
                                : assignment.permissions;
      return {
        id: userId,
        name: userDetail?.name || 'Unknown User',
        email: userDetail?.email || 'unknown@example.com',
        permissions: displayPermission as EventUser['permissions'],
      };
    });
    return HttpResponse.json(response);
  }),

  http.post('/api/users/:eventSlug/:userId', async ({ request, params }) => {
    const { eventSlug, userId: pathUserId } = params;
    const userId = String(pathUserId);

    const eventOrError = getEventOr404(eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    const payload = await request.json() as UpdateEventUserPermissionsPayload;

    if (!db.users || !db.users[userId]) {
        return HttpResponse.json({ message: `User with ID "${userId}" not found globally.` }, { status: 404 });
    }
    if (!event.assignedUsers) {
      event.assignedUsers = {};
    }

    if (payload.permissions === null) {
      delete event.assignedUsers[userId];
      return new HttpResponse(null, { status: 204 });
    } else {
      event.assignedUsers[userId] = { permissions: payload.permissions as EventUserPermissionSetting };
      const userDetail = db.users[userId];
      const responseUser: EventUser = {
        id: userId,
        name: userDetail.name,
        email: userDetail.email,
        permissions: db.currentUser?.id === userId ? 'self' : payload.permissions,
      };
      return HttpResponse.json(responseUser, { status: 200 });
    }
  }),

  http.get('/api/usersearch/:eventSlug', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() || '';
    const count = parseInt(url.searchParams.get('n') || '5', 10);

    const allUsers = Object.values(db.users || {});
    const filteredUsers = allUsers.filter(user =>
      user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );
    const response: SearchUsersResponse = filteredUsers.slice(0, count).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }));
    return HttpResponse.json(response);
  }),

  http.get('/api/sources/:eventSlug/:sourceId/scheduleupdate', ({ params }) => {
    const eventOrError = getEventOr404(params.eventSlug, db);
    if (eventOrError instanceof HttpResponse) return eventOrError;
    const event = eventOrError;

    const { sourceId } = params;

    if (!event.sources || !event.sources[String(sourceId)]) {
      return HttpResponse.json({ message: `Source with ID "${String(sourceId)}" not found in event "${event.slug}".` }, { status: 404 });
    }

    console.log(`[MSW] Mock schedule update triggered for event "${event.slug}", source "${String(sourceId)}"`);

    // This endpoint likely just triggers a background job and returns success.
    // 204 No Content is a good response for this.
    return new HttpResponse(null, { status: 204 });
  }),

  // ++ New mock for OIDC code exchange ++
  http.post('/api/exchange', async ({ request }) => {
    const payload = await request.json() as OidcExchangePayload;

    if (!payload.code) {
      return HttpResponse.json({ message: 'Authorization code is required.' }, { status: 400 });
    }

    // Simulate successful code exchange
    if (payload.code === 'mock_oidc_auth_code_123') {
      const response: OidcExchangeResponse = {
        token: `mock-oidc-jwt-token-for-code-${payload.code}-${Date.now()}`,
      };
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 300));
      return HttpResponse.json(response, { status: 200 });
    } else {
      // Simulate an error for an invalid code
      await new Promise(resolve => setTimeout(resolve, 300));
      return HttpResponse.json({ message: 'Invalid or expired OIDC code.' }, { status: 400 });
    }
  }),
];