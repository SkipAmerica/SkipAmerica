# ADR-002: State Management Strategy

**Status**: Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context
Need clear separation between server state (user data, creator lists) and UI state (modal open, form inputs) to avoid over-fetching and stale data issues.

## Decision
- **Server State**: React Query exclusively for all API data
- **UI State**: Local component state (useState, useReducer) scoped to feature
- **Global State**: Only via Context providers with specific justification in ADR

## Consequences
✅ **Positive**: Automatic caching, background updates, optimistic updates  
⚠️ **Negative**: Learning curve for React Query patterns  
📋 **Mitigation**: Shared query hooks, consistent error handling, documentation