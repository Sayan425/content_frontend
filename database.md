# Database Documentation

## Overview

This database powers a content creation pipeline system. It allows creators to track competitors, scrape content ideas, write scripts, render videos using AI avatars, and manage the editing process — all with an optional approval workflow where a reviewer (client/editor) can approve or reject content at each stage.

The entire pipeline is tied together by a single `content_id` that flows through every table from idea to published video.

---

## Table of Contents

1. [users](#1-users)
2. [avatar_details](#2-avatar_details)
3. [watchlists](#3-watchlists)
4. [watchlist_results](#4-watchlist_results)
5. [content_pipeline](#5-content_pipeline)
6. [scripts_final](#6-scripts_final)
7. [production_queue](#7-production_queue)
8. [edit_queue](#8-edit_queue)
9. [How Everything Connects](#9-how-everything-connects)
10. [Content Flow: End to End](#10-content-flow-end-to-end)

---

## 1. users

**Purpose:** Stores every person who has an account in the system — both creators and reviewers.

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `user_id` | uuid | NO | gen_random_uuid() | Primary key. Unique identifier for every user. |
| `created_at` | timestamptz | NO | now() | When the account was created. |
| `email` | text | NO | — | User's email address. Must be unique across all users. |
| `ph_no` | text | YES | — | Phone number. Optional, must be unique if provided. |
| `subscription_tier` | text | YES | — | What plan the user is on. e.g. free, pro, enterprise. |
| `name` | text | YES | — | Display name of the user. |
| `role` | text | NO | 'creator' | Whether this person is a `creator` (makes content) or a `reviewer` (approves content). |

**Allowed values for `role`:** `creator`, `reviewer`

**Notes:**
- Creators have avatars, watchlists, scripts, and videos.
- Reviewers only log in to approve or reject content assigned to them.
- A creator can assign a reviewer to their avatar, which activates the approval workflow.

---

## 2. avatar_details

**Purpose:** Stores the AI avatars that creators use to produce videos. One creator can have multiple avatars. Each avatar has its own look, voice, watchlist, and optionally its own reviewer.

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `avatar_id` | uuid | NO | gen_random_uuid() | Primary key. Unique identifier for each avatar. |
| `created_at` | timestamptz | NO | now() | When the avatar was created. |
| `name` | text | NO | '' | Display name of the avatar. |
| `base_look` | text | NO | '' | The default/primary look of the avatar used for rendering. |
| `other_looks` | jsonb | YES | — | Additional looks or variants the avatar can use. Stored as JSON. |
| `demo_voice` | text | NO | '' | The voice file used by this avatar for video generation. |
| `owner_user_id` | uuid | NO | — | FK to `users`. The creator who owns this avatar. |
| `approver_user_id` | uuid | YES | — | FK to `users`. The reviewer assigned to approve content for this avatar. NULL means no approval needed. |
| `approval_settings` | jsonb | YES | — | Granular toggles for which stages the assigned reviewer needs to approve. NULL if no approver is assigned. |

**Notes:**
- `approver_user_id` is the key to the approval system. If set, the system checks `approval_settings` to see which stages require approval.
- `approval_settings` should be NULL when there is no approver. When an approver is assigned, it defaults (via the frontend) to `{"idea": true, "script": true, "production": true, "edit": true}` unless toggled off by the creator.
- `demo_voice` here is the default voice. Individual production jobs can override it with a `custom_voiceover`.

**Connections:**
- Owned by `users` via `owner_user_id`
- Reviewer assigned via `approver_user_id` → `users`
- Referenced by `watchlists`, `watchlist_results`, `content_pipeline`, `scripts_final`, `production_queue`, `edit_queue`

---

## 3. watchlists

**Purpose:** Stores the list of competitors a creator is tracking for a specific avatar. Each entry is one competitor on one platform.

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `competitor_id` | uuid | NO | gen_random_uuid() | Primary key. Unique identifier for each competitor entry. |
| `created_at` | timestamptz | NO | now() | When this competitor was added to the watchlist. |
| `owner_user_id` | uuid | NO | — | FK to `users`. The creator tracking this competitor. Deletes cascade. |
| `owner_avatar_id` | uuid | NO | — | FK to `avatar_details`. Which avatar this watchlist belongs to. Deletes cascade. |
| `competitor_name` | text | NO | — | Name of the competitor. e.g. "Gary Vee", "Alex Hormozi". |
| `competitor_link` | text | NO | — | Profile or channel URL of the competitor. |
| `competitor_platform` | text | NO | — | Platform being tracked. e.g. instagram, youtube, tiktok, linkedin. |

**Notes:**
- One avatar can track multiple competitors across multiple platforms.
- When a user is deleted, all their watchlist entries are automatically deleted (CASCADE).
- Platform validation is handled by the frontend/application, not the database.

**Connections:**
- Owned by `users` via `owner_user_id`
- Belongs to an avatar via `owner_avatar_id` → `avatar_details`
- Referenced by `watchlist_results` via `owner_competitor_id`

---

## 4. watchlist_results

**Purpose:** Stores individual pieces of content scraped from competitors. Each row is one video or post from a tracked competitor. This is where ideas live before they enter the content pipeline.

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `content_id` | uuid | NO | gen_random_uuid() | Primary key. Unique identifier for each scraped content piece. |
| `created_at` | timestamptz | NO | now() | When this result was scraped and saved. |
| `owner_user_id` | uuid | NO | — | FK to `users`. The creator who owns this result. Deletes cascade. |
| `owner_avatar_id` | uuid | NO | — | FK to `avatar_details`. The avatar this result belongs to. |
| `owner_competitor_id` | uuid | NO | — | FK to `watchlists`. Which competitor this content came from. Deletes cascade. |
| `date_of_posting` | date | YES | — | When the competitor originally posted this content. |
| `content_link` | text | YES | — | URL to the original content. Must be unique. |
| `content_impressions` | bigint | YES | — | How many impressions/views this content received. |
| `content_engagement` | bigint | YES | — | Raw engagement number (likes, comments, shares). |
| `content_virality_score` | numeric | YES | — | Calculated virality score. Typically a percentage. |
| `content_engagement_score` | numeric | YES | — | Calculated engagement score. Typically a percentage. |
| `content_topic` | text | YES | — | The main topic of this content piece. |
| `content_take` | text | YES | — | The angle or opinion the competitor took on the topic. |
| `content_format` | text | YES | — | Format of the content. e.g. talking head, listicle, story. |
| `content_hook` | text | YES | — | The opening hook used in the content. |
| `content_cta` | text | YES | — | The call to action used at the end. |
| `content_transcript` | text | YES | — | Full transcript of the content if available. |
| `saved_to_idea_vault` | text | NO | 'no' | Whether this idea has been saved to the pipeline. |

**Allowed values for `saved_to_idea_vault`:** `no`, `pending_approval`, `yes`

**How `saved_to_idea_vault` works:**
- `no` — idea has not been acted on yet
- `pending_approval` — creator wants to use this idea but it needs reviewer approval first
- `yes` — idea is approved and a `content_pipeline` row has been created for it

**Notes:**
- When `saved_to_idea_vault` flips to `yes`, a new row is created in `content_pipeline` at the `idea` stage.
- If the avatar has an `approver_user_id`, the status goes to `pending_approval` first and waits for the reviewer.
- If no approver, it goes directly to `yes` and the pipeline row is created immediately.

**Connections:**
- Owned by `users` via `owner_user_id`
- Linked to avatar via `owner_avatar_id` → `avatar_details`
- Linked to competitor via `owner_competitor_id` → `watchlists`
- Indirectly linked to `content_pipeline` when idea is saved

---

## 5. content_pipeline

**Purpose:** The central spine of the entire system. Every piece of content — whether scraped from a competitor or created from scratch — has exactly one row here. This table tracks where a piece of content is in its lifecycle from idea to published video.

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `content_id` | uuid | NO | gen_random_uuid() | Primary key. This ID flows through every other table in the pipeline. |
| `created_at` | timestamptz | NO | now() | When this content piece entered the pipeline. |
| `owner_user_id` | uuid | NO | — | FK to `users`. The creator who owns this content. |
| `owner_avatar_id` | uuid | YES | — | FK to `avatar_details`. Which avatar this content is being made for. |
| `approver_user_id` | uuid | YES | — | FK to `users`. The reviewer for this content. Copied from avatar settings at creation time. NULL if no approval needed. |
| `current_stage` | text | NO | 'idea' | Where this content currently is in the pipeline. |
| `stage_updated_at` | timestamptz | NO | now() | When the stage last changed. Useful for tracking bottlenecks. |
| `approval_status` | text | YES | — | Current approval state. NULL if no approver assigned. |
| `reviewer_notes` | text | YES | — | Notes left by the reviewer when rejecting content. Explains what needs to change. |
| `topic` | text | YES | — | The topic of this content piece. Set when script is written. Used for display without joining to scripts_final. |
| `final_video` | text | YES | — | URL of the final rendered video once the editing is completed. |
| `cover_image` | text | YES | — | URL of the cover image associated with this content pipeline. |

**Allowed values for `current_stage`:** `idea`, `script`, `production`, `edit`, `completed`

**Allowed values for `approval_status`:** `pending`, `approved`, `rejected`

**Constraints:**
- If `approver_user_id` is set, `approval_status` must also be set. They cannot be mismatched — both must be NULL or both must have values.

**Notes:**
- This is the only table you need to query to get a bird's eye view of all content and where it stands.
- `stage_updated_at` helps identify content that has been stuck at a stage for too long.
- `reviewer_notes` is shared across all stages — when a reviewer rejects at any stage, their feedback lives here.

**Connections:**
- References `users` (owner and approver)
- References `avatar_details`
- Referenced by `scripts_final`, `production_queue`, `edit_queue` via `content_id`

---

## 6. scripts_final

**Purpose:** Stores the final script for a piece of content. One script per content piece. This is where the written content lives before it goes to video rendering.

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `content_id` | uuid | NO | — | Primary key AND FK to `content_pipeline`. Links this script to its pipeline entry. |
| `created_at` | timestamptz | NO | now() | When the script was created. |
| `owner_user_id` | uuid | NO | auth.uid() | FK to `users`. The creator who wrote this script. |
| `owner_avatar_id` | uuid | NO | — | FK to `avatar_details`. Which avatar this script is written for. |
| `topic` | text | YES | — | The main topic of the script. |
| `take` | text | YES | — | The angle or opinion the script takes on the topic. |
| `hook` | text | YES | — | The opening hook of the script. |
| `cta` | text | YES | — | The call to action at the end of the script. |
| `storytelling_format` | text | YES | — | The narrative structure used. e.g. problem-solution, listicle, story. |
| `creator_persona` | text | YES | — | The persona or voice the script is written in. Influences tone and style. |
| `final_script` | text | YES | — | The complete final script text. Must be unique across all scripts. |
| `status` | text | NO | 'approved' | Approval state of this script. |

**Allowed values for `status`:** `pending_approval`, `approved`, `rejected`

**How `status` works:**
- When a script is created and the avatar has no approver → `approved` (default, goes straight to rendering)
- When a script is created and the avatar has an approver → set to `pending_approval`, waits for reviewer
- Reviewer approves → `approved`, content moves to rendering stage
- Reviewer rejects → `rejected`, creator revises, resubmits

**Notes:**
- `content_id` is both the PK and FK — enforcing the strict 1:1 relationship with `content_pipeline`.
- A script cannot exist without a corresponding `content_pipeline` row.
- `final_script` has a UNIQUE constraint — no two scripts can have identical text.

**Connections:**
- 1:1 with `content_pipeline` via `content_id`
- Owned by `users` via `owner_user_id`
- Linked to avatar via `owner_avatar_id` → `avatar_details`

---

## 7. production_queue

**Purpose:** Stores the video rendering jobs sent to the AI rendering service (RunPod). One content piece can have multiple rendering jobs — one per avatar segment. This supports multi-avatar videos where different avatars speak different parts of the script.

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `content_id` | uuid | NO | — | Part of composite PK. FK to `content_pipeline`. |
| `segment_index` | integer | NO | 1 | Part of composite PK. The order of this segment in the final video. Starts at 1. |
| `created_at` | timestamptz | NO | now() | When this rendering job was created. |
| `owner_user_id` | uuid | NO | — | FK to `users`. The creator who owns this job. |
| `owner_avatar_id` | uuid | NO | — | FK to `avatar_details`. Which avatar is speaking in this segment. |
| `image_link` | text | NO | — | The avatar image used for rendering this segment. |
| `demo_voice` | text | NO | — | The voice file used for this segment. |
| `custom_voiceover` | text | YES | — | A custom uploaded voiceover file. Overrides demo_voice if provided. |
| `script` | text | NO | — | The portion of the script for this specific segment. |
| `status` | text | NO | 'queued' | Current state of this rendering job. |
| `generation_note` | text | YES | — | Note provided by the runpod worker when it runs (e.g. error logs). |
| `edit_settings` | jsonb | YES | — | All the editing settings for the video (template, overlays, style, etc). |
| `generated_video_url` | text | YES | — | URL of the rendered video once the job completes. |

**Allowed values for `status`:** `queued`, `processing`, `pending_approval`, `approved`, `rejected`

**Composite PK explained:**
- `(content_id, segment_index)` together uniquely identify each segment
- e.g. content `abc` can have segments `(abc, 1)`, `(abc, 2)`, `(abc, 3)` — one per avatar
- To regenerate a failed segment, delete the row and reinsert with the same `(content_id, segment_index)`

**How multi-avatar works:**
```
content_id = "abc", segment_index = 1 → Avatar A speaks the intro
content_id = "abc", segment_index = 2 → Avatar B speaks the main content
content_id = "abc", segment_index = 3 → Avatar A speaks the outro
```
The edit queue stitches these together in `segment_index` order.

**Notes:**
- `custom_voiceover` overrides `demo_voice` when a creator uploads their own voice recording.
- `note` is a log field — do not use it for user-facing content.
- When a job fails, delete the row and create a new one with the same segment index.

**Connections:**
- Linked to `content_pipeline` via `content_id`
- Owned by `users` via `owner_user_id`
- Linked to avatar via `owner_avatar_id` → `avatar_details`
- Referenced by `edit_queue` conceptually (edit stitches segments together)

---

## 8. edit_queue

**Purpose:** Stores the editing job for a piece of content after all rendering segments are complete. One edit job per content piece. This is where the raw rendered segments get stitched together, subtitles are added, and the final video is assembled.

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `content_id` | uuid | NO | — | Primary key AND FK to `content_pipeline`. 1:1 with pipeline. |
| `created_at` | timestamptz | NO | now() | When this edit job was created. |
| `owner_user_id` | uuid | NO | — | FK to `users`. The creator who owns this edit job. |
| `owner_avatar_id` | uuid | NO | — | FK to `avatar_details`. Which avatar this edit is for. |
| `topic` | text | YES | — | Topic of the content. Kept here for convenience without needing a join. |
| `script` | text | YES | — | Full script. Kept here for reference during editing. |
| `raw_video_link` | text | YES | — | URL of the raw rendered video before editing. |
| `manifest` | jsonb | YES | — | JSON object describing the current edit state — cuts, transitions, overlays, timing. |
| `subtitle` | jsonb | YES | — | JSON object containing subtitle data for the video. |
| `status` | text | NO | 'queued' | Current state of the edit job. |

**Allowed values for `status`:** `queued`, `processing`, `pending_approval`, `approved`

**How `manifest` works:**
- Stores the editing instructions as a JSON object
- Describes how segments are stitched together, where cuts happen, what overlays are applied
- Gets updated as the edit progresses

**How `subtitle` works:**
- Stores subtitle timing and text as JSON
- Generated automatically from the script/transcript
- Can be manually adjusted

**Notes:**
- `content_id` is both PK and FK — strict 1:1 with `content_pipeline`.
- `topic` and `script` are duplicated here from other tables for query convenience — avoids joins during editing.
- Unlike `production_queue`, there is no segment concept here — editing always produces one final video.

**Connections:**
- 1:1 with `content_pipeline` via `content_id`
- Owned by `users` via `owner_user_id`
- Linked to avatar via `owner_avatar_id` → `avatar_details`

---

## 9. How Everything Connects

```
users
  ├── avatar_details (one creator, many avatars)
  │     ├── approver_user_id → users (optional reviewer)
  │     ├── watchlists (one avatar, many competitors)
  │     │     └── watchlist_results (one competitor, many scraped posts)
  │     │           └── saved_to_idea_vault = 'yes' → creates content_pipeline row
  │     │
  │     └── content_pipeline (one avatar, many content pieces)
  │           ├── scripts_final (1:1 — one script per content piece)
  │           ├── production_queue (1:many — one row per avatar segment)
  │           └── edit_queue (1:1 — one edit job per content piece)
```

**The `content_id` thread:**

Every piece of content gets a `content_id` from `content_pipeline`. This single ID is the common thread across:
- `scripts_final.content_id` — the script for this content
- `production_queue.content_id` — the rendering jobs for this content
- `edit_queue.content_id` — the edit job for this content

To get the full history of any piece of content, query by `content_id` across all tables.

---

## 10. Content Flow: End to End

### Path A — Scraped Content (from competitor watchlist)

```
1. Creator adds competitor to watchlists
        ↓
2. System scrapes competitor content → row created in watchlist_results
        ↓
3. Creator reviews scraped content, decides to use an idea
        ↓
4. Check avatar_details.approver_user_id
        ↓ NULL                              ↓ NOT NULL
saved_to_idea_vault = 'yes'          saved_to_idea_vault = 'pending_approval'
        ↓                                   ↓ reviewer approves
5. content_pipeline row created (current_stage = 'idea', approval_status = 'approved')
        ↓
6. Creator writes script → scripts_final row created (content_id from pipeline)
        ↓
7. Check approver → status = 'pending_approval' or 'approved'
        ↓ approved
8. `content_pipeline.current_stage` → `'production'`
        ↓
9. production_queue rows created (one per avatar segment)
        ↓
10. Rendering completes → generated_video_url filled in
        ↓
11. Check approver → status = 'pending_approval' or 'approved'
        ↓ approved
12. `content_pipeline.current_stage` → `'edit'`
        ↓
13. edit_queue row created — segments stitched, subtitles added
        ↓
14. Check approver → status = 'pending_approval' or 'approved'
        ↓ approved
15. `content_pipeline.current_stage` → `'completed'`
16. Finalized video output generated, uploaded, and `final_video` link saved in `content_pipeline`.
```

### Path B — Original Content (creator writes from scratch)

```
1. Creator decides to make original content
        ↓
2. Frontend calls backend function:
   → INSERT into `content_pipeline` (`current_stage` = `'script'`)
   → INSERT into scripts_final with returned content_id
        ↓
3. Same approval flow as Path A from step 7 onwards
```

### Approval Flow (at any stage)

```
Content hits a stage that requires approval
        ↓
approval_status = 'pending' in content_pipeline
        ↓
Reviewer logs in, sees pending items
        ↓ approved                    ↓ rejected
approval_status = 'approved'     approval_status = 'rejected'
content moves forward            reviewer_notes filled in
                                 creator sees feedback, fixes, resubmits
                                 approval_status → 'pending' again
```

### Rejection at any stage goes back to the creator:
- `content_pipeline.approval_status = 'rejected'`
- `content_pipeline.reviewer_notes` contains what needs to change
- Creator fixes the issue, resubmits
- `approval_status` flips back to `pending`
- Reviewer reviews again
