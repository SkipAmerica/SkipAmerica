# Deprecated Discovery Components

This directory contains components that were moved during the discovery system refactoring.

## Background

During the refactoring of the discovery system, the search functionality was removed from the Discovery Toggle and preserved only in the bottom navigation search tab.

## Available Components

The search functionality is still fully available in:
- `src/components/discovery/CreatorSearch.tsx` - Main search component
- `src/components/discovery/CreatorSearchHeader.tsx` - Search header with filters
- `src/components/discovery/AdvancedCreatorSearch.tsx` - Advanced search interface

These components continue to be used by the bottom navigation search tab.

## Discovery Toggle Changes

The Discovery Toggle was changed from:
- **Old**: Browse/Match/Search
- **New**: Discover/Browse/Match

The search functionality was removed from the discovery toggle but preserved in the bottom navigation.