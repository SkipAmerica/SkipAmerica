# ADR-003: API Validation and Contracts

**Status**: Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context
Need runtime validation for API boundaries and consistent error handling across all features.

## Decision
- Zod schemas for all request/response validation at API boundaries
- Centralized query keys in `shared/api/query-keys.ts`
- Unified error handling with typed APIError class

## Consequences
✅ **Positive**: Runtime safety, better error messages, type inference  
⚠️ **Negative**: Schema maintenance overhead  
📋 **Mitigation**: Generate schemas from Supabase types where possible