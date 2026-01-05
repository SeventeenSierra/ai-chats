# UI Test Specification - ai-chats

This document maps UI elements to user workflows for comprehensive E2E test coverage.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: [☰][Logo] Gemini Oracle  [Dashboard][Explorer] [⋮] │
├────────────────────┬────────────────────────────────────────┤
│                    │                                        │
│     Sidebar        │         Main Content Area              │
│  (collapsible)     │                                        │
│  ┌──────────────┐  │  ┌──────────────────────────────────┐  │
│  │ Explorer     │  │  │ Welcome View (no selection)      │  │
│  │ heading      │  │  │         OR                       │  │
│  └──────────────┘  │  │ Conversation View (selected)     │  │
│                    │  │                                  │  │
│  ┌──────────────┐  │  │                                  │  │
│  │ Search       │  │  │                                  │  │
│  └──────────────┘  │  │                                  │  │
│                    │  │                                  │  │
│  ┌──────────────┐  │  │                                  │  │
│  │ Group|Filter │  │  │                                  │  │
│  │ Sort buttons │  │  │                                  │  │
│  └──────────────┘  │  │                                  │  │
│                    │  │                                  │  │
│  ┌──────────────┐  │  └──────────────────────────────────┘  │
│  │ Conversation │  │                                        │
│  │ List         │  │                                        │
│  └──────────────┘  │                                        │
└────────────────────┴────────────────────────────────────────┘
```

---

## Header Components

### Navigation Tabs
| Element | Selector |
|---------|----------|
| Dashboard | `Link[href="/dashboard"]` with LayoutDashboard icon |
| Explorer | `Link[href="/explorer"]` with MessageSquare icon |

### Header Menu (⋮)
| Option | Icon | Action |
|--------|------|--------|
| Quick Import | Upload | Opens simple import dialog |
| Pipeline | Waypoints | Opens 5-stage pipeline dialog |
| Download All | Download | Zips and downloads all conversations |
| Toggle Theme | Sun/Moon | Submenu: Light, Dark, System |
| Wipe Data | Trash2 (red) | Shows confirmation dialog |

**Playwright Tests:**
```typescript
test('header menu opens', async ({ page }) => {
  await page.goto('/explorer');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByText('Quick Import')).toBeVisible();
  await expect(page.getByText('Pipeline')).toBeVisible();
  await expect(page.getByText('Download All')).toBeVisible();
});

test('wipe data shows confirmation', async ({ page }) => {
  await page.goto('/explorer');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByText('Wipe Data').click();
  await expect(page.getByText('Are you absolutely sure?')).toBeVisible();
});
```

---

## Pipeline Dialog (5 Stages)

The pipeline separates processing into distinct phases:

### Stage 1: Upload
- Upload XML file to storage
- Shows file name when complete
- **Reset** button to start over

### Stage 2: Split
- Split XML into individual conversations
- Shows count of staged files
- **Reset** button clears staging

### Stage 3: Extract Metadata
- Parse title, timestamp, turn count
- Shows processed count
- **Reset** button clears processing

### Stage 4: Fetch Transcripts (AI Step)
- Parse full transcript content
- Separate from stages 1-3 for performance
- Shows fetched count with progress

### Stage 5: Add Backlinks
- AI enrichment with wikilinks
- Optional - can skip
- Shows backlinked count

### Stage 6: Review
- Pipeline complete
- Link to Explorer page

**Playwright Tests:**
```typescript
test('pipeline dialog shows 5 stages', async ({ page }) => {
  await page.goto('/explorer');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByText('Pipeline').click();
  
  await expect(page.getByText('Stage 1: Upload')).toBeVisible();
  await expect(page.getByText('Stage 2: Split')).toBeVisible();
  await expect(page.getByText('Stage 3: Metadata')).toBeVisible();
});

test('pipeline upload accepts XML', async ({ page }) => {
  await page.goto('/explorer');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByText('Pipeline').click();
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/seed-data.xml');
});
```

---

## Sidebar Controls

### Search Input
- Placeholder: "Search titles and content..."
- Filters conversation list in real-time

### Group Button
- Options: "None", "Category"
- Groups conversations by category with accordions

### Filter Button
| Filter | Type |
|--------|------|
| No Category Only | Checkbox |
| Deep Research Only | Checkbox |
| Status | Submenu (Active, Archived, All) |
| Rich Content | Submenu (Any, Yes, No) |
| Character Count | Multi-select (sm, md, lg, xl) |
| Turn Count | Multi-select (xs, sm, md, lg) |

### Sort Button
- Options: Date, Title, Turn Count, Character Count
- Direction toggle (asc/desc)

**Playwright Tests:**
```typescript
test('filter by deep research', async ({ page }) => {
  await page.goto('/explorer');
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByText('Deep Research Only').click();
});

test('group by category', async ({ page }) => {
  await page.goto('/explorer');
  await page.getByRole('button', { name: 'Group' }).click();
  await page.getByRole('menuitemradio', { name: 'Category' }).click();
});
```

---

## Conversation List

### List Item Elements
- Checkbox for multi-select
- Title with rich content badge
- Date and turn count
- Category indicator

### Interactions
- Click item → shows details in main area
- Check checkbox → enables bulk actions
- Drag → reorder within category (if grouped)

**Playwright Tests:**
```typescript
test('select conversation shows details', async ({ page }) => {
  await page.goto('/explorer');
  // Assumes seed data is loaded
  await page.locator('[data-conversation-id]').first().click();
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
});

test('multi-select enables process button', async ({ page }) => {
  await page.goto('/explorer');
  await page.locator('input[type="checkbox"]').first().click();
  await expect(page.getByText(/Process \d+/)).toBeVisible();
});
```

---

## Conversation View

### Header
- Title (editable?)
- Category dropdown
- Status badge

### Transcript
- Alternating user/model messages
- Code blocks with syntax highlighting
- Rich content indicators

### Actions
- Summarize button
- Export to Markdown

---

## Dashboard Page

### Stats Cards
- Total Conversations
- Processed
- Archived

### Chart
- Category distribution (Recharts)

### Quick Actions
- Import button
- Pipeline button

---

## Test Data Requirements

For E2E testing:
1. **Seed data**: `apps/ai-chats/seed-data/` directory
2. **Database**: Supabase (local or test instance)
3. **Storage**: Supabase Storage or mock

---

## Implementation Priority

| Priority | Tests | Status |
|----------|-------|--------|
| P0 | Page loads, navigation | TODO |
| P0 | Header menu works | TODO |
| P1 | Pipeline stages 1-3 | TODO |
| P1 | Search/Filter/Sort | TODO |
| P2 | Conversation selection | TODO |
| P2 | Bulk operations | TODO |
| P3 | Pipeline stage 4-5 (AI) | TODO |
| P3 | Export functionality | TODO |
