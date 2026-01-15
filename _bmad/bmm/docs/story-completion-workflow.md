# BMad Method - Story Completion Workflow Guide
## Universal Step-by-Step Command Reference

**Version:** 1.0  
**Last Updated:** 2026-01-14  
**Purpose:** Standard workflow for completing any story using proper BMad Method flow

---

## 🎯 Overview

This guide provides the exact command sequence to safely complete any story in the BMad Method. Follow this workflow for every story to ensure quality gates are met.

**BMad Quality Gates:**
```
1. DEV AGENT    → Implements story with tests
2. CODE REVIEW  → Adversarial review in fresh context
3. FIX ISSUES   → Address review findings
4. QA AGENT     → Validates acceptance criteria
   │
   ├─ ✅ PASS → 5. PM AGENT (Update Status)
   │
   └─ ❌ FAIL → Loop back to Step 1 (Dev fixes)
                 │
                 └─ Iterate until QA passes
```

---

## 📋 Standard Story Implementation Cycle

### Phase 1: Development
### Phase 2: Code Review
### Phase 3: Quality Assurance
### Phase 4: Status Update

---

## 🔄 Complete Workflow: Step-by-Step

### Step 1: Start Development
**Agent:** `dev` (Amelia 💻)  
**Command:** `/dev` then select option **2** (dev-story)

```bash
# 1. Activate dev agent
/dev

# 2. Select: 2 (*dev-story)
# This launches the full dev-story workflow

# 3. Dev agent will prompt for story ID
# Enter: story-X.Y (e.g., story-5.2, story-6.1)

# 4. Dev agent auto-executes:
#    ✓ Loads story file (docs/storyX.Y.md)
#    ✓ Reads all tasks/subtasks
#    ✓ Implements each task in order
#    ✓ Writes comprehensive tests
#    ✓ Runs test suite after each task
#    ✓ Creates implementation artifact
```

**What Dev Agent Delivers:**
- ✅ All code implementation
- ✅ All tests passing (100% required)
- ✅ Implementation artifact in `_bmad-output/implementation-artifacts/storyX.Y.md`

**Dev Agent Principles:**
- Story file is source of truth
- Red-Green-Refactor cycle (test first, then implementation)
- No task marked complete without passing tests
- Never skip or reorder tasks/subtasks

---

### Step 2: Code Review (Fresh Context)
**Agent:** `dev` (Amelia 💻)  
**Command:** `/dev` then select option **3** (code-review)

> [!IMPORTANT]
> **Fresh Context Recommended:** Start a NEW conversation for code reviews to get unbiased analysis free from implementation context bias.

```bash
# In a NEW conversation (recommended):
/dev

# Select: 3 (*code-review)

# Enter story ID when prompted
# e.g., story-5.2
```

**What Code Review Covers:**
- Security vulnerabilities
- Edge cases and error handling
- Test coverage gaps
- Code quality and maintainability
- Architecture pattern violations
- Performance concerns
- Accessibility issues

**Deliverable:** Code review report with prioritized action items

---

### Step 3: Address Review Findings
**Agent:** `dev` (Amelia 💻)  
**Command:** Continue with dev agent or start fresh

```bash
# If issues found in code review:

# Option A: Continue in same context
# Implement fixes for each issue

# Option B: New context (for complex fixes)
/dev
# Select: 2 (*dev-story)
# Focus on specific fixes

# After fixes:
npm test
# Verify all tests still pass ✅
```

**Exit Criteria:**
- All critical issues resolved
- All tests passing
- Code review accept

---

### Step 4: QA Validation
**Agent:** `tea` (Quality Assurance ☕)  
**Command:** `/tea` then follow QA workflow

```bash
# 1. Start QA agent
/tea

# 2. Follow menu to select validation workflow
# Common options:
#   - Validate acceptance criteria
#   - Run integration tests
#   - Test user flows
#   - Performance validation

# 3. QA agent will:
#    ✓ Check each AC from story file
#    ✓ Run integration test suite
#    ✓ Validate user experience
#    ✓ Test edge cases
#    ✓ Create QA report
```

**Deliverable:** QA Pass/Fail report in `_bmad-output/`

**QA Agent Produces These Artifacts:**

1. **Traceability Matrix** (`traceability-matrix-story-X.Y.md`)
   - **Purpose**: Maps each acceptance criterion to its test coverage
   - **Shows**: Which tests validate which ACs
   - **Identifies**: Coverage gaps (missing tests for specific ACs)
   - **Use it to**: Verify every AC has corresponding test coverage
   
   **Example Structure:**
   ```
   | AC ID | Description | Test ID | Test File | Coverage Status |
   |-------|-------------|---------|-----------|-----------------|
   | AC-1  | User clicks Buy ISBN | isbn.test.ts | ✅ Covered |
   | AC-2  | Webhook creates order | stripe.test.ts | ✅ Covered |
   | AC-3  | Warn when pool empty | isbn.test.ts | ❌ Missing E2E |
   ```

2. **Quality Gate Decision** (`gate-decision-story-X.Y.md`)
   - **Purpose**: Final PASS/FAIL decision for the story
   - **Shows**: Whether all acceptance criteria are satisfied
   - **Includes**: 
     - Summary verdict (✅ PASS or ❌ FAIL)
     - List of passing ACs
     - List of failing ACs (if any)
     - Blocking issues that must be fixed
     - Recommendations for improvements
   - **Use it to**: Decide whether to update status OR iterate back to dev

**How to Use These Files:**

```bash
# After QA runs, check the Quality Gate Decision FIRST:
# _bmad-output/gate-decision-story-5.2.md

# ✅ If PASS:
#    - All ACs satisfied
#    - No blocking issues
#    → Proceed to Step 5 (Update Status)

# ❌ If FAIL:
#    - Read which ACs failed
#    - Check Traceability Matrix for coverage gaps
#    - Review recommendations
#    → Go to Step 4b (Iteration Loop)
```

> [!TIP]
> **Traceability Matrix** = Diagnostic tool (shows test coverage)  
> **Quality Gate Decision** = Final verdict (tells you what to do next)

**QA Principles:**
- Every acceptance criterion must pass
- Real user flows must be tested
- No regressions allowed
- Document any known limitations

---

### Step 4b: When QA Fails (Iteration Loop) 🔄
**This is the critical step that forms the quality feedback loop!**

> [!WARNING]
> **QA Failed?** DO NOT update workflow status yet. You must loop back to development and fix issues first.

#### Decision Tree: QA Results

```
QA Report Received
    │
    ├─ ✅ ALL ACs PASS → Go to Step 5 (Update Status)
    │
    └─ ❌ SOME ACs FAIL → Follow iteration loop below
```

#### The QA Iteration Loop

When QA agent reports issues, follow this exact sequence:

**1️⃣ Read QA Report Carefully**
```bash
# QA agent creates report in _bmad-output/
# Read it thoroughly to understand:
#   - Which acceptance criteria failed
#   - What specific issues were found
#   - Severity (Critical, Major, Minor)
#   - Steps to reproduce
```

**2️⃣ Categorize Issues**

Determine the type and severity of issues:

| Issue Type | Severity | Action Required |
|------------|----------|-----------------|
| **AC Not Implemented** | 🔴 Critical | Go back to dev agent, implement missing AC |
| **Broken Functionality** | 🔴 Critical | Dev agent fixes bug immediately |
| **Test Failures** | 🔴 Critical | Fix tests, verify all pass |
| **UX/Polish Issues** | 🟡 Major | Dev agent addresses, may iterate with UX |
| **Documentation Gap** | 🟢 Minor | Update docs/comments |
| **Edge Case Handling** | 🟡 Major | Add edge case handling + tests |

**3️⃣ Return to Dev Agent**

> [!IMPORTANT]
> **DO NOT start a new story.** Fix the current story first. QA failures must be resolved before marking complete.

```bash
# Option A: Same Conversation (for minor fixes)
# Continue in current context
# Explain QA findings to dev agent
# Dev agent implements fixes

# Option B: Fresh Context (for major rework)
/dev
# Select: 2 (*dev-story)
# Enter: story-X.Y (same story)
# Explain: "QA found issues in acceptance criteria X, Y, Z"
# Dev agent re-implements failed sections
```

**4️⃣ Dev Agent Fixes Issues**

```bash
# Dev agent will:
# 1. Read QA report
# 2. Identify root causes
# 3. Implement fixes for each failed AC
# 4. Add/update tests for fixed issues
# 5. Run full test suite
# 6. Update implementation artifact with fixes
```

**5️⃣ Verify Fixes Locally**

```bash
# Always verify before re-QA:
npm test            # All tests must pass
npm run build       # Build must succeed
npm run dev         # Manual smoke test

# Check that specific QA issues are resolved
```

**6️⃣ Re-Run QA (Iteration)**

```bash
# After fixes are complete:
/tea

# Follow same QA workflow
# QA agent re-validates ALL acceptance criteria
# Creates updated QA report
```

**7️⃣ Decision Point: Pass or Iterate Again?**

```
QA Re-Test Results
    │
    ├─ ✅ ALL ACs PASS → Go to Step 5 (Update Status)
    │
    └─ ❌ STILL FAILING → Repeat Step 4b (iterate again)
```

> [!CAUTION]
> **Maximum 3 iterations recommended.** If QA fails 3 times, consider:
> - Story scope too large (split into smaller stories)
> - Unclear acceptance criteria (refine story file)
> - Technical blocker (escalate to architect)
> - Use `/pm` → `*party-mode` for collaborative problem-solving

---

#### Quick Command Reference: QA Iteration

```bash
# ========================================
# QA FAILED - ITERATION LOOP
# ========================================

# 1. READ QA REPORT
# Location: _bmad-output/qa-report-storyX.Y.md

# 2. FIX ISSUES
/dev
# Continue in context OR start fresh
# Implement fixes for failed ACs
# Add tests for fixed issues

# 3. VERIFY FIXES
npm test
npm run build

# 4. RE-RUN QA
/tea
# Re-validate all ACs

# 5. CHECK RESULTS
# ✅ Pass → Go to Step 5 (update status)
# ❌ Fail → Repeat iteration loop

# ========================================
```

---

#### Real-World Example: QA Iteration

**Scenario:** Story 5.2 (ISBN Purchase Workflow)

```bash
# Initial QA Run
/tea
# QA Report: ❌ FAILED
#   - AC 5.2.3: Stripe webhook not handling failed payments
#   - AC 5.2.5: ISBN not validating format correctly
#   - Tests: Missing test for duplicate ISBN prevention

# Iteration 1: Fix Issues
/dev
# Implement:
#   ✓ Add webhook handler for payment_intent.payment_failed
#   ✓ Add ISBN format validation (regex: 978-X-XXXX-XXXX-X)
#   ✓ Write test: "prevents duplicate ISBN assignment"
npm test  # All pass ✅

# QA Run #2
/tea
# QA Report: ❌ FAILED
#   - AC 5.2.3: ✅ PASS (webhook fixed)
#   - AC 5.2.5: ✅ PASS (validation fixed)
#   - NEW: AC 5.2.1: UI doesn't show loading state during checkout

# Iteration 2: Fix UI Issue
/dev
# Implement:
#   ✓ Add loading spinner during Stripe redirect
#   ✓ Disable submit button when processing
npm test  # All pass ✅

# QA Run #3
/tea
# QA Report: ✅ PASS
#   - All ACs validated ✅
#   - No regressions ✅

# NOW UPDATE STATUS
/pm
# Select: 2 → 4 → 1
# Mark story-5.2 as completed
```

---

### Step 5: Update Workflow Status
**Agent:** `pm` (John 📋)  
**Command:** `/pm` then navigate to status update

```bash
# 1. Start PM agent
/pm

# 2. Select: 2 (*workflow-status)
# View current status

# 3. When status screen appears:
# Select: 4 (Update workflow status)

# 4. Select: 1 (Mark as completed)

# 5. Enter workflow ID
# e.g., story-5.2

# 6. Enter file path
# e.g., docs/story5.2.md
# or: _bmad-output/implementation-artifacts/story5.2.md
```

**What This Does:**
- ✅ Updates `_bmad-output/bmm-workflow-status.yaml`
- ✅ Marks story as completed
- ✅ Identifies next story automatically
- ✅ Updates sprint progress metrics

> [!CAUTION]
> **ALWAYS Update Status:** This step is critical for project tracking. Never skip it.

---

## 🎬 Quick Reference: Agent Commands

### Development Agent (Amelia 💻)
```bash
/dev                           # Activate dev agent
  1. [M] Menu                  # Redisplay menu
  2. *dev-story                # Execute story (MAIN WORKFLOW)
  3. *code-review              # Review code (FRESH CONTEXT)
  4. [D] Dismiss               # Exit agent
```

### QA Agent (TEA ☕)
```bash
/tea                           # Activate QA agent
  # Follow menu for validation workflows
  # Options vary by project TestArch setup
```

### PM Agent (John 📋)
```bash
/pm                            # Activate PM agent
  1. [M] Menu                  # Redisplay menu
  2. *workflow-status          # Get project status
  3. *create-prd               # Create PRD
  4. *create-epics-and-stories # Create epics/stories
  5. *implementation-readiness # Validate readiness
  6. *correct-course           # Course correction
  7. *party-mode               # Multi-agent chat
  8. *advanced-elicitation     # Deep elicitation
  9. [D] Dismiss               # Exit agent
```

### Architect Agent (Alex 🏗️)
```bash
/architect                     # For technical design work
  # Use before complex stories
  # Creates architecture artifacts
```

### UX Designer Agent
```bash
/ux-designer                   # For UX design work
  # Use for user experience stories
```

---

## 🚨 Critical BMad Rules

> [!CAUTION]
> **Rule 1: NEVER Skip Tests**  
> Dev agent MUST write comprehensive tests for every task. Never mark a task complete without passing tests. No exceptions.

> [!CAUTION]
> **Rule 2: Story File = Source of Truth**  
> The story file (`docs/storyX.Y.md`) contains the authoritative tasks/subtasks sequence. Dev agent follows this EXACTLY. Never deviate.

> [!WARNING]
> **Rule 3: Fresh Context for Reviews**  
> Code reviews in fresh context catch issues the implementing agent might miss due to context bias. Start a new conversation.

> [!IMPORTANT]
> **Rule 4: Always Update Workflow Status**  
> After completing ANY story, ALWAYS update `bmm-workflow-status.yaml` via PM agent. This keeps project tracking accurate.

> [!IMPORTANT]
> **Rule 5: All Tests Must Pass**  
> NEVER proceed to the next story with failing tests. Fix all breaks immediately.

---

## 📊 Quality Checklist

After completing each story, verify:

### ✅ Development Phase
- [ ] All tasks/subtasks from story file implemented
- [ ] Comprehensive unit tests written for each task
- [ ] All tests passing: `npm test` (or your test command)
- [ ] Implementation artifact created
- [ ] Code follows project standards

### ✅ Review Phase
- [ ] Code review completed (fresh context preferred)
- [ ] All critical issues addressed
- [ ] Security vulnerabilities checked
- [ ] Performance considerations addressed

### ✅ QA Phase
- [ ] All acceptance criteria validated
- [ ] Integration tests passing
- [ ] User flows tested
- [ ] No regressions introduced
- [ ] QA report generated

### ✅ Status Update
- [ ] `bmm-workflow-status.yaml` updated
- [ ] Story marked with correct file path
- [ ] Next story identified
- [ ] Sprint metrics current

---

## 💡 Pro Tips

### Tip 1: Use Fresh Context for Reviews
Start a new conversation for code reviews to get unbiased analysis free from implementation context.

### Tip 2: Run Tests Frequently
Don't wait until the end. Run tests after every task completion:
```bash
npm test
```

### Tip 3: Keep Workflow Status Synced
Update status immediately after story completion while details are fresh.

### Tip 4: Read Story Files Completely
Before starting implementation, read the ENTIRE story file to understand dependencies and sequencing.

### Tip 5: Party Mode for Complex Stories
For stories requiring multiple perspectives:
```bash
/pm
# Select: 7 (*party-mode)
# Bring in multiple expert agents for collaborative problem-solving
```

### Tip 6: Use Architect for Technical Design
For complex technical stories, engage the architect first:
```bash
/architect
# Create technical design document
# Then hand to dev agent with clear specs
```

---

## 🔄 Workflow Variations

### Quick Flow (Solo Developer)
For simple, low-risk stories:
```bash
/quick-flow-solo-dev
# Handles dev→review→qa in one shot
# Faster but less thorough
# Use for simple stories only
```

### Full BMM Flow (Recommended)
For production-quality stories:
```bash
# Step 1: /dev → *dev-story
# Step 2: *code-review (fresh context)
# Step 3: Fix issues
# Step 4: /tea → QA validation
# Step 5: /pm → update status
```

### Epic-Level Planning
Before starting a new epic:
```bash
/pm
# Select: 5 (*implementation-readiness)
# Validates PRD/UX/Architecture/Epics alignment
# Ensures epic is ready for development
```

---

## 🆘 Troubleshooting

### Problem: Tests Failing
**Solution:**
```bash
# View test output
npm test

# Fix failing tests before proceeding
# NEVER mark task complete with failing tests

# Re-run after fixes
npm test
```

### Problem: QA Validation Failed
**Solution:**
```bash
# DO NOT move to next story
# DO NOT update workflow status

# Step 1: Read QA report carefully
# Location: _bmad-output/qa-report-storyX.Y.md

# Step 2: Go back to dev agent
/dev
# Continue in context OR start fresh
# Explain QA findings
# Implement fixes for each failed AC

# Step 3: Verify fixes
npm test
npm run build

# Step 4: Re-run QA
/tea
# QA re-validates all ACs

# Step 5: Iterate until all ACs pass
# See "Step 4b: When QA Fails" for detailed iteration loop
```

> [!TIP]
> **See detailed QA iteration workflow in Step 4b above** with decision tree, severity categorization, and real-world examples.

### Problem: Lost Track of Progress
**Solution:**
```bash
/pm
# Select: 2 (*workflow-status)
# View current project state
# Identify next steps
```

### Problem: Story Off-Track
**Solution:**
```bash
/pm
# Select: 6 (*correct-course)
# PM analyzes current state
# Suggests corrective actions
```

### Problem: Unclear Requirements
**Solution:**
```bash
/pm
# Select: 8 (*advanced-elicitation)
# Deep-dive requirements clarification
```

### Problem: Need Multiple Expert Opinions
**Solution:**
```bash
/pm
# Select: 7 (*party-mode)
# Multi-agent collaborative session
# Get architect, UX, dev perspectives together
```

---

## 📈 Tracking Progress

### View Project Status Anytime
```bash
/pm
# Select: 2 (*workflow-status)

# Shows:
# - Completed stories
# - Current story
# - Next story
# - Epic progress
# - Sprint metrics
```

### Check Test Coverage
```bash
npm test -- --coverage
# View coverage report
```

### Review Implementation Artifacts
```bash
# Check: _bmad-output/implementation-artifacts/
# Each story should have its artifact
```

---

## 🎯 Template: Story Completion Commands

Copy this template for each new story:

```bash
# ========================================
# STORY: [story-X.Y] [Story Name]
# ========================================

# --- DEVELOPMENT ---
/dev
# Select: 2 (*dev-story)
# Enter: story-X.Y

# Wait for dev agent to complete...
# ✓ Implementation done
# ✓ Tests passing
# ✓ Artifact created

# --- CODE REVIEW (NEW CONVERSATION) ---
/dev
# Select: 3 (*code-review)
# Enter: story-X.Y

# Review findings...

# --- FIX ISSUES (if needed) ---
# Implement fixes
npm test

# --- QA VALIDATION ---
/tea
# Follow QA workflow

# --- UPDATE STATUS ---
/pm
# Select: 2 → 4 → 1
# Enter: story-X.Y
# Enter: docs/storyX.Y.md

# ========================================
# STORY COMPLETE ✅
# ========================================
```

---

## 🏁 Summary: The Safe Path

**For Every Story:**

1. **Development:** `/dev` → `*dev-story` → enter story ID
2. **Review:** New context → `/dev` → `*code-review`
3. **Fix:** Address review findings, re-run tests
4. **QA:** `/tea` → Validate acceptance criteria
5. **Status:** `/pm` → Update workflow status
6. **Next:** Repeat for next story

**Quality Gates:**
- ✅ All tests passing
- ✅ Code review accepted
- ✅ QA validation passed
- ✅ Status updated

**Never Skip:**
- Writing tests
- Running full test suite
- Code review
- Updating workflow status

---

## 📚 Related Documentation

- **BMad Quick Start:** `_bmad/bmm/docs/quick-start.md`
- **Agent Guide:** `_bmad/bmm/docs/agents-guide.md`
- **Workflow Architecture:** `_bmad/bmm/docs/workflow-architecture-reference.md`
- **Implementation Workflows:** `_bmad/bmm/docs/workflows-implementation.md`
- **Test Architecture:** `_bmad/bmm/docs/test-architecture.md`

---

**This workflow ensures quality at every step while maintaining project tracking accuracy. Follow it for every story to build production-ready features with confidence.**
