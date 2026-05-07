# ForgeTrack — Product Specification Sheet

**Version:** 1.0  
**Role:** Mentor  
**Status:** Active Development  

---

## Overview

ForgeTrack is a role-based attendance management platform designed for educational institutions. It allows mentors to upload bulk attendance data via CSV, automatically parse and normalize it, persist all records into a structured database, and display every student's attendance history broken down by date. The system handles large datasets (2,800+ records) without data loss or filtering, and dynamically expands its UI to accommodate all data.

---

## Core Features

---

### 1. CSV Upload & AI-Powered Format Detection

**What it does:**  
Mentors can upload any CSV file containing attendance data. The system uses AI to automatically detect the format of the uploaded file — including pivoted date layouts, flat row-per-session layouts, and multi-column headers — and normalizes the data before storage.

**Key behaviors:**
- Accepts `.csv` files via drag-and-drop or file picker
- AI detects and labels the format (e.g. "Pivoted Dates", "Flat Log", "Multi-header")
- Displays a confirmation banner showing the detected format before committing data
- Shows a live progress bar and record count during parsing (e.g. "2800 records ready")
- Validates each row for required fields: USN, Date, Present/Absent status, Student Name, Email, Branch Code
- Rejects malformed rows and reports them to the mentor with row numbers
- Supports re-upload to refresh or append data

**Fields extracted from CSV:**

| Field | Type | Required |
|---|---|---|
| USN | String (e.g. `4SF24CI013`) | Yes |
| Date | String / Boolean-encoded | Yes |
| Present | Boolean or Status string | Yes |
| Student Name | String | Yes |
| Email | String | No |
| Branch Code | String | No |

---

### 2. Full Dataset Extraction — No Record Truncation

**What it does:**  
Every record from the uploaded CSV is extracted and stored. The system does not sample, limit, or truncate records. If a file contains 2,800 records, all 2,800 are parsed and inserted into the database.

**Key behaviors:**
- Processes all rows in a single pass using a streaming parser
- Handles pivoted date formats where each column represents a class session date, and each row represents one student — these are unpivoted into individual attendance records
- Deduplicates records by (USN + Date) to prevent double-inserts on re-upload
- Stores the total parsed record count and displays it in the UI ("2800 records ready")
- Insertion is batched for performance; large files insert in chunks of 500 rows

---

### 3. Persistent Database Storage

**What it does:**  
All parsed attendance records are inserted into a client-side IndexedDB database, providing persistent, queryable storage across sessions without requiring a backend server.

**Database schema:**

**Store: `attendance`**

| Column | Type | Description |
|---|---|---|
| `id` | Auto-increment integer | Primary key |
| `usn` | String | University Seat Number |
| `date` | String (ISO format) | Class session date |
| `present` | Boolean | Attendance status |
| `studentName` | String | Full name of student |
| `email` | String | Student email |
| `branchCode` | String | Academic branch/section |
| `uploadedAt` | Timestamp | When this record was inserted |

**Indexes:**
- `usn` — for fast per-student lookups
- `date` — for fast per-date lookups
- `usn + date` (compound) — for deduplication

**Key behaviors:**
- Database initializes automatically on first load
- Data persists across page refreshes and browser sessions
- Full database can be cleared via Settings → Reset Data
- Export of stored records back to CSV is supported

---

### 4. Date-Wise Attendance View

**What it does:**  
The primary data view organizes all attendance records by date, showing every student's status under each class session. This replaces the broken single-student view shown in the original upload preview.

**Key behaviors:**
- Groups all records by date, sorted in ascending chronological order
- Each date renders as a collapsible section header showing:
  - The session date
  - Total students present
  - Total students absent
  - Percentage attendance for that session
- Within each date section, a table lists every student with columns: USN, Student Name, Status (Present/Absent badge), Email, Branch Code
- Present students are shown with a green badge; absent with a red badge
- Sections are collapsible to manage screen space for large datasets
- If the number of date sections exceeds what fits in the viewport, the page scrolls continuously — no pagination cutoff

---

### 5. Dynamic UI Expansion

**What it does:**  
The frontend automatically creates and renders new layout sections as needed to accommodate all records and all dates. There is no hardcoded maximum number of sections, rows, or visible items.

**Key behaviors:**
- Date sections are generated dynamically from database records — no templates are hardcoded
- The layout grows vertically as more dates or students are added
- The sidebar remains fixed while the main content area scrolls independently
- If a student has records across 40 different dates, 40 entries appear under that student in Student History
- Overflow is handled with scrollable containers, never by hiding or truncating records

---

### 6. Student History View

**What it does:**  
Each student has a dedicated history page showing their complete attendance record across every session, along with summary statistics.

**Key behaviors:**
- Accessible from the "Student History" sidebar item
- Search by USN or student name to pull up a specific student
- Displays a summary card showing:
  - Total sessions
  - Sessions present
  - Sessions absent
  - Attendance percentage
- A full chronological table lists every session with date and status
- Attendance percentage uses a color-coded indicator: green (≥75%), amber (50–74%), red (<50%)

---

### 7. Mark Attendance

**What it does:**  
Mentors can manually mark attendance for a session directly in the UI without uploading a CSV, useful for single-class quick entry.

**Key behaviors:**
- Mentor selects a date and branch code
- The system loads the full student list for that branch
- Each student row has a toggle switch: Present / Absent
- Submission inserts or updates records in the database for that (USN + date) pair
- Confirmation toast appears on successful save

---

### 8. Role-Based Access

**What it does:**  
The application supports a mentor role with appropriate permissions. Future roles (Admin, Student) are planned but not yet active.

**Current role — Mentor:**
- Can upload CSV files
- Can view all students' attendance
- Can mark attendance manually
- Can access Student History for any student
- Can view and download Materials
- Cannot modify other mentors' data

---

### 9. Navigation & Layout

**Sidebar sections:**

| Section | Items |
|---|---|
| Overview | Dashboard |
| Activity | Mark Attendance, Student History, Materials |
| Data | Upload CSV (AI badge) |
| Account | Settings |
| — | Logout |

**Layout rules:**
- Sidebar is fixed-width (220px) and always visible
- Main content area scrolls independently
- Active nav item is highlighted with a left accent border
- The Upload CSV item carries an "AI" badge indicating AI-assisted format detection

---

### 10. Dashboard

**What it does:**  
The Dashboard provides a high-level summary of all attendance data currently in the database.

**Metrics displayed:**
- Total records stored
- Total unique students
- Overall attendance rate (%)
- Sessions logged (unique dates)

**Visualizations:**
- Bar chart: attendance rate per date (all sessions)
- Per-branch attendance breakdown
- Top 10 students by attendance percentage
- Bottom 10 students by attendance percentage (at-risk)

---

## Data Flow

```
CSV File Upload
      ↓
AI Format Detection (detect pivoted vs flat layout)
      ↓
Row Parsing & Normalization (all rows, no limit)
      ↓
Validation (flag bad rows, report to mentor)
      ↓
Deduplication Check (USN + Date compound key)
      ↓
Batch Insert → IndexedDB (chunks of 500)
      ↓
UI Re-render (date-wise sections, student history, dashboard stats)
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| CSV has unrecognized format | Show warning with raw preview; ask mentor to confirm column mapping |
| Row missing USN or Date | Skip row; log to "Skipped Rows" report shown after upload |
| Duplicate USN + Date | Update existing record rather than insert duplicate |
| Database quota exceeded | Show storage warning; prompt mentor to export and clear old data |
| Upload interrupted | Partial data is not committed; transaction rolls back cleanly |

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React (JSX), Tailwind CSS utility classes |
| Storage | IndexedDB (via idb wrapper) |
| CSV Parsing | PapaParse (streaming mode) |
| AI Detection | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Charts | Chart.js 4.x |
| Icons | Tabler Icons (outline) |
| Fonts | Courier New / system monospace for data; sans-serif for UI |

---

## Planned Features (Not Yet Implemented)

- Admin role with cross-mentor data access
- Student portal (read-only view of own attendance)
- Email alerts for students below 75% attendance threshold
- PDF export of date-wise attendance reports
- Integration with institutional student registry API
- Multi-semester data separation

---

## Known Issues Fixed in This Version

| Issue | Fix |
|---|---|
| Upload preview showed only one student's records repeated | Full dataset extraction now unpivots all rows correctly |
| Date column showed "true", "true (1)", "true (2)" instead of real dates | Pivoted format detector now maps column headers to actual dates |
| 2800 records entered but only ~10 displayed | All records now batch-inserted; UI renders all date sections dynamically |
| No space in frontend for all dates | Dynamic section generation with vertical scroll — no hardcoded section limit |

---

*ForgeTrack Specification Sheet — Mentor Edition — v1.0*
