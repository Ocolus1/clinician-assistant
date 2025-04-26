# Changelog

## 2025-04-26

### Removed
- Removed debug routes and test files that were not needed in the application:
  - `server/routes/debug-routes.ts` - Debug routes for budget flow analysis
  - `server/routes/debug.ts` - Debug route registration module
  - `debug-budget-flow.js` - Budget flow debugging script
  - `debug-session-notes.js` - Session notes retrieval debugging script
  - `test-budget-endpoints-curl.sh` - Test script for budget endpoints using cURL
  - `verify-sessions-api.js` - Session API verification tool
- Removed debug routes registration from `server/index.ts`
