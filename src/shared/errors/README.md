# Error Handling System

This directory contains the normalized error handling system for the live streaming feature.

## Files

- `normalizeError.ts` - Core utility that converts any error into a structured format
- `networkHelper.ts` - Enhanced fetch wrapper with detailed HTTP error logging
- `index.ts` - Re-exports all error utilities

## Sample Console Output

When Go Live fails, you'll see logs like this:

```
[LIVE][START] Requesting permissions...
[LIVE][START_FAILED] {
  "name": "NotAllowedError",
  "message": "Permission denied by system",
  "code": undefined,
  "stack": "NotAllowedError: Permission denied by system\n    at getUserMedia...",
  "cause": undefined,
  "meta": {
    "step": "request_permissions",
    "state": "STARTING",
    "event": "GO_LIVE"
  }
}
```

Or for network errors:

```
[NETWORK][abc123] POST https://api.supabase.co/rest/v1/live_sessions → 500
[LIVE][START_FAILED] {
  "name": "HttpError", 
  "message": "POST https://api.supabase.co/rest/v1/live_sessions → 500",
  "code": 500,
  "stack": "Error: POST https://api.supabase.co/rest/v1/live_sessions → 500\n    at fetchWithErrorHandling...",
  "meta": {
    "url": "https://api.supabase.co/rest/v1/live_sessions",
    "method": "POST", 
    "status": 500,
    "responseSnippet": "{\"error\":\"Internal server error\"}",
    "requestId": "abc123",
    "step": "start_session_api",
    "state": "STARTING",
    "event": "GO_LIVE",
    "userId": "user-123"
  }
}
```

## State Transition Logs

When `window.__LIVE_DEBUG = true` (automatically set in dev), you'll see:

```
[LIVE] OFFLINE –GO_LIVE–> STARTING { "payload": { "type": "GO_LIVE" }, "timestamp": "2025-09-21T21:40:04.552Z" }
[LIVE] STARTING –LIVE_STARTED–> LIVE { "payload": { "type": "LIVE_STARTED" }, "timestamp": "2025-09-21T21:40:05.123Z" }
```

## Error Boundary Logs

ErrorBoundary no longer shows `{}`. Instead it logs:

```
Live system error: {
  "name": "Error",
  "message": "Rendered fewer hooks than expected",
  "stack": "Error: Rendered fewer hooks...",
  "meta": {
    "componentStack": "\n    in LiveControlBarContent..."
  }
}
```

## Toast Messages

Users see clear error messages:
- "Camera/Microphone Access Required" (permissions)
- "Connection Failed" (WebRTC)
- "Failed to go live - Database error occurred" (API)