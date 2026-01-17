-- Migration: Document blog_posts RLS policy intent
-- PR Review Fix: Clarify intentional asymmetry between SELECT and UPDATE policies

-- ============================================================================
-- RLS POLICY DOCUMENTATION
-- ============================================================================
--
-- INTENTIONAL DESIGN: SELECT policy is broader than UPDATE policy
--
-- SELECT (blog_posts_select_member):
--   - Allows ANY account member to view all posts in their account
--   - Rationale: Enables team collaboration workflows:
--     1. Team members can review each other's draft posts before publishing
--     2. Account admins can see all content for moderation/quality control
--     3. Support agents can assist with any post issues
--   - This is a deliberate asymmetry from UPDATE policy
--
-- UPDATE (blog_posts_update_owner_admin):
--   - Only post owner OR account admin can edit
--   - Rationale: Prevents accidental edits to others' content
--   - Admins retain edit rights for emergency corrections
--
-- If stricter access is needed in the future, change SELECT policy to:
--   owner_user_id = public.get_current_user_id()
--   OR public.is_account_admin(account_id)
--   OR public.is_account_member(account_id)  -- Remove this line for owner-only
-- ============================================================================

-- Add policy comment for documentation
comment on policy "blog_posts_select_member" on public.blog_posts is
  'INTENTIONAL: All account members can view posts for collaboration (draft review, team coordination). UPDATE remains owner/admin-only to prevent accidental edits.';

comment on policy "blog_posts_update_owner_admin" on public.blog_posts is
  'Only post owner or account admin can update. Stricter than SELECT policy by design - see blog_posts_select_member comment.';
