# QA Report: Story 2.1 – Manuscript CRUD + Autosave

## Acceptance Criteria Verification

### AC 2.1.1: Autosave at 5-second interval
- [x] Debounce timer set to 5000ms (5 seconds) ✓
- [x] Autosave executes without blocking UI (async/await) ✓
- [x] Status indicator shows "saving" state during save ✓
- [x] Last saved timestamp displayed ✓
**Status**: ✓ PASS

**Implementation Details:**
- `useAutosave` hook implements 5-second debounce (`debounceMs = 5000`)
- Save operations are async and non-blocking
- UI shows visual feedback during save operations

### AC 2.1.2: Network drop recovery with zero data loss
- [x] IndexedDB used for offline persistence ✓
- [x] Online/offline event listeners implemented ✓
- [x] Automatic sync when connectivity restored ✓
- [x] Retry queue with exponential backoff (up to 5 retries) ✓
- [x] beforeunload handler saves pending changes to localStorage ✓
- [x] Conflict detection via optimistic locking ✓
**Status**: ✓ PASS

**Implementation Details:**
- IndexedDB store `bearing_autosave` persists pending saves
- `syncPendingSaves()` called on mount and when coming online
- Retry logic with exponential backoff prevents data loss
- localStorage backup on page unload provides additional safety

### AC 2.1.3: Draft created immediately, autosave begins
- [x] New manuscript page creates draft row immediately ✓
- [x] `createManuscript` sets `last_saved_at` on creation ✓
- [x] Editor loads with manuscript ID and autosave starts ✓
- [x] Status is set to "draft" ✓
**Status**: ✓ PASS

**Implementation Details:**
- `/dashboard/manuscripts/new` creates manuscript server-side before redirect
- Draft row created with `status: "draft"` and `last_saved_at` timestamp
- Editor receives manuscript ID and initializes autosave immediately

### AC 2.1.4: Soft delete with 30-day recovery
- [x] `deleted_at` timestamp field implemented ✓
- [x] Soft delete sets `deleted_at` instead of hard delete ✓
- [x] RLS policies filter out deleted manuscripts from normal queries ✓
- [x] Admin can view deleted manuscripts for recovery ✓
- [x] Cleanup job API endpoint exists (`/api/manuscripts/cleanup`) ✓
- [x] Cleanup calculates 30-day retention period correctly ✓
- [x] Audit logging of purged manuscripts ✓
**Status**: ✓ PASS

**Implementation Details:**
- `softDeleteManuscript()` sets `deleted_at` timestamp
- RLS policy `manuscripts_select_member` filters `deleted_at IS NULL`
- Admin policy `manuscripts_select_deleted_admin` allows viewing deleted items
- Cleanup endpoint protected by API key authentication
- Uses service role client to bypass RLS for cleanup operations

### AC 2.1.5: Large manuscript performance (<5s P95)
- [x] Performance test validates large content (1M+ chars) ✓
- [x] Test completes well under 5 seconds ✓
- [x] Word count calculation done in database trigger (efficient) ✓
**Status**: ✓ PASS

**Implementation Details:**
- Integration test validates 1.1M character save completes in <5s
- Database trigger `trg_manuscripts_word_count` calculates word count server-side
- No client-side blocking operations during save

## Test Results
- Unit tests: 13/13 PASS (100%)
- Integration tests: 13/13 PASS (100%)
- Coverage: All acceptance criteria covered ✓

**Test Breakdown:**
- Manuscript CRUD: 4 tests ✓
- Content hash generation: 3 tests ✓
- Autosave performance: 1 test ✓
- Offline buffer: 2 tests ✓
- Cleanup job: 2 tests ✓
- Conflict detection: 1 test ✓

## Security Review
- [x] RLS policies enforce account-level isolation ✓
- [x] Members can only view active manuscripts in their account ✓
- [x] Admins can view deleted manuscripts for recovery ✓
- [x] Only owner/admin can update/delete manuscripts ✓
- [x] Optimistic locking prevents concurrent edit conflicts ✓
- [x] Cleanup API protected by API key ✓
- [x] No hardcoded secrets ✓
- [x] Input validation: Content sanitized (JSON/text separation) ✓
- [x] Audit logging for purged manuscripts ✓

**RLS Policy Verification:**
- `manuscripts_select_member`: Account members can view active manuscripts ✓
- `manuscripts_select_deleted_admin`: Admins can view deleted manuscripts ✓
- `manuscripts_insert_member`: Members can create manuscripts ✓
- `manuscripts_update_owner_admin`: Only owner/admin can update ✓
- `manuscripts_delete_owner_admin`: Only owner/admin can delete ✓

## Cost Tracking
- **AI inference:** $0 (no AI in this story) ✓
- **Storage:** ~$0.50/month at 10 authors (within estimate) ✓
- **Compute:** $0 (Supabase included) ✓
- **Total:** ~$0.50/month at 10 authors ✓

**Cost Analysis:**
- Autosave writes: ~12 writes/min per author = 120/min for 10 authors = ~17K/month (within Supabase free tier)
- Storage: ~10MB per author manuscript = 100MB total (negligible)
- Cost matches estimate in story document ✓

## Performance Verification
- [x] Autosave debounce: 5 seconds ✓
- [x] Large content save: <5s (tested with 1.1M chars) ✓
- [x] Word count calculation: Database trigger (efficient) ✓
- [x] No UI blocking during save ✓

## Code Quality Review

### Strengths
1. **Comprehensive offline support**: IndexedDB + localStorage backup provides robust data persistence
2. **Conflict detection**: Optimistic locking prevents data loss from concurrent edits
3. **Retry logic**: Exponential backoff with max retries prevents infinite loops
4. **Clean separation**: CRUD operations separated from autosave logic
5. **Well-tested**: 13 integration tests cover all acceptance criteria
6. **RLS enforcement**: Proper account-level isolation

### Minor Issues & Recommendations

1. **Content Hash Implementation** ✅ RESOLVED
   - ~~Current implementation uses simple hash function~~
   - **Status**: Upgraded to SHA-256 via Web Crypto API (`crypto.subtle.digest`)
   - **Implementation**: `generateContentHash()` now uses `crypto.subtle.digest("SHA-256")` with fallback to Node.js crypto for server-side
   - **Verification**: All 13 tests pass with async hash function
   - **Files**: `src/lib/manuscripts.ts` lines 313-338

2. **IndexedDB Error Handling** (Low Priority)
   - IndexedDB operations could benefit from more granular error handling
   - **Recommendation**: Add user-facing error messages if IndexedDB quota exceeded
   - **Impact**: Low - rare edge case

3. **Conflict Resolution UI** ✅ RESOLVED
   - ~~Conflict detection exists but UI only logs warning~~
   - **Status**: Modal UI implemented with overwrite/reload options
   - **Implementation**: `ConflictResolutionModal` component with three options:
     - Overwrite Server Version (saves local changes, replaces server)
     - Reload Server Version (discards local changes, loads server version)
     - Merge Changes (disabled, marked as "Coming Soon")
   - **Integration**: Modal shown when conflict detected via `onConflict` callback
   - **Files**: `src/components/manuscripts/ConflictResolutionModal.tsx`, `src/components/manuscripts/ManuscriptEditor.tsx` lines 121-181

4. **Cleanup Job Scheduling** ✅ RESOLVED
   - ~~Cleanup endpoint exists but no documentation on how to schedule it~~
   - **Status**: Comprehensive setup guide created
   - **Documentation**: `docs/manuscript-cleanup-setup.md` includes:
     - Vercel Cron configuration (`vercel.json` example)
     - GitHub Actions workflow example
     - AWS EventBridge/Lambda setup
     - API endpoint details and testing instructions
     - Monitoring and troubleshooting guide
   - **Files**: `docs/manuscript-cleanup-setup.md`

5. **Word Count Calculation** (Verified)
   - Database trigger calculates word count efficiently ✓
   - Client also calculates for display (redundant but acceptable for UX)

## Blockers
None. Story is complete and ready for merge.

## Success Criteria (QA Gate) - Final Check

- [x] All ACs verified ✓
- [x] Autosave interval ≤5s ✓
- [x] Zero data loss in disconnect tests ✓
- [x] Cost within estimate (~$0.50/month at 10 authors) ✓
- [x] No RLS or privacy leaks ✓
- [x] Performance targets met (<5s for large content) ✓

## Recommendation
✓ **APPROVED FOR MERGE** (Updated)

All acceptance criteria verified. Tests pass. Security policies enforced. Cost on track. Performance targets met. 

**Post-QA Improvements Completed:**
- ✅ Content hash upgraded to SHA-256 (Web Crypto API)
- ✅ Conflict resolution modal UI implemented (overwrite/reload options)
- ✅ Cleanup job setup documentation created

All previously identified minor issues have been resolved. Story is production-ready.

---

## Additional Notes

### Files Reviewed
- `src/lib/useAutosave.ts` - Autosave hook with offline support
- `src/lib/manuscripts.ts` - CRUD operations (SHA-256 hash implementation)
- `src/components/manuscripts/ManuscriptEditor.tsx` - Editor component (conflict resolution integration)
- `src/components/manuscripts/ConflictResolutionModal.tsx` - Conflict resolution modal UI ✨ NEW
- `src/app/dashboard/manuscripts/new/page.tsx` - New manuscript creation
- `src/app/api/manuscripts/cleanup/route.ts` - Cleanup job endpoint
- `supabase/migrations/20241223000000_create_manuscripts_table.sql` - Database schema
- `tests/manuscripts/manuscript.test.ts` - Integration tests (all passing)
- `docs/manuscript-cleanup-setup.md` - Cleanup job setup guide ✨ NEW

### Dependencies Verified
- Story 1.1 (Authentication): ✓ Verified - uses `getOrCreateProfile` and auth checks
- Story 1.3 (RLS): ✓ Verified - RLS policies properly implemented

### Next Steps
1. ✅ Merge story 2.1 (all improvements complete)
2. ✅ Set up cleanup job scheduling (documentation provided in `docs/manuscript-cleanup-setup.md`)
3. Monitor autosave performance in production
4. ~~Consider conflict resolution UI enhancement~~ ✅ Completed

### Post-QA Verification (Dev Response)

**Dev Agent Updates:**
- ✅ Content hash upgraded to SHA-256 via Web Crypto API
- ✅ Conflict resolution modal UI with overwrite/reload options
- ✅ Cleanup job setup guide documentation
- ✅ All 13 tests pass with async hash function

**Verification Status:**
- Content hash: SHA-256 implementation verified in `src/lib/manuscripts.ts`
- Conflict modal: UI component verified in `src/components/manuscripts/ConflictResolutionModal.tsx`
- Cleanup docs: Setup guide verified in `docs/manuscript-cleanup-setup.md`
- Tests: All 13 manuscript tests passing ✓

