# Instructions

## Project Purpose

This scraper extracts job listings from AXON SOFT careers page (Romania only) and imports them to peviitor.ro.

Target: https://axon-soft.com/en/jobs/romania

## Model Schemas

The job and company models are defined in:
- `job-model.md` - Job model schema
- `company-model.md` - Company model schema

## Important

These models are **dynamic** and can change over time. They are based on the official Peviitor Core schemas which may be updated.

## How to Keep Models Updated

When working on this scraper:

1. **Check for updates** in the Peviitor Core repository:
   - Repository: https://github.com/peviitor-ro/peviitor_core
   - Main file: README.md (contains Job and Company model schemas)

2. **When to update**:
   - Before starting new development work
   - If field requirements or validations have changed
   - If new fields have been added

3. **How to update**:
   - Fetch the latest README.md from peviitor_core main branch
   - Compare with current job-model.md and company-model.md
   - Update local files if there are differences
   - Update index.js mapping logic if field requirements changed

## Technologies

- **Node.js & JavaScript** - For scraping and data extraction
- **Peviitor API** - For data storage and indexing (via REST API)
- **Claude Code** - For development

## Workflow Steps

1. **Start with brand** - We know the brand (e.g., "AXON SOFT")
2. **Search in DemoANAF** - Find company by brand, get CIF from search results
3. **Get company details from ANAF** - Using CIF, fetch full company data from ANAF
4. **Validate with Peviitor** - Verify company exists in Peviitor, get group/brand info
5. **Check existing jobs in API** - Query Peviitor API by CIF to see what jobs already exist
6. **Check company status** - If ANAF status = "inactive" → DELETE existing jobs from API and STOP
7. **Save company.json** - Save all ANAF + Peviitor data for backup
8. **Scrape new jobs** - Extract jobs from AXON SOFT careers page (Romania)
9. **Transform for API** - Validate and fix job data:
   - location: Only Romanian cities allowed
   - tags: lowercase, no diacritics
   - company: uppercase
10. **Upsert to API** - Import/update jobs in Peviitor
11. **Verify URLs** - Check existing job URLs still work, delete 404s
12. **Clean stale jobs** - Delete jobs that exist in API but not on source site

## Running the Scraper

```bash
# Run the full scraper workflow (single command)
node scraper/index.js

# Test mode (one page only, limit 10 jobs)
node scraper/index.js --test
```

> **Important**: Scraper deletes jobs that no longer exist on the source site but preserves jobs from other sources (ANOFM, etc). It only upserts/deletes AXON SOFT Careers jobs.

## Full Workflow (automatic)

When running `node scraper/index.js`, the following steps happen automatically:

1. **Check existing jobs count** - Query Peviitor API by CIF (read-only)
2. **Save existing jobs** - Save current job URLs for stale cleanup
3. **Validate company via ANAF** - Check company exists and is active
4. **Scrape jobs** - Extract jobs from AXON SOFT careers API (Romania only)
5. **Transform for API** - Fix locations (only Romanian cities), normalize fields
6. **Upsert to API** - Add/update jobs
7. **Delete stale jobs** - Remove jobs in API that no longer appear on source site
8. **Show Summary** - Log job counts

## Workflow Flowchart

```
config/company.json (single source of truth: CIF, brand, URLs)
    │
    ▼
scraper/index.js
    │
    ▼
querySOLR(CIF) - get existing jobs, save URLs to tmp/jobs_existing.json
    │
    ▼
company.js (validate company)
    ├── load cache (company.json)
    │   └── if fresh (<7 days), skip ANAF entirely
    ├── ANAF API ──► get company name + CIF (only if cache stale/missing)
    └── Peviitor API ──► validate company model
    │
    ▼ (if active)
scrape AXON SOFT website (jobs for Romania)
    │
    ▼
transformJobsForSOLR()
    ├── Filter: keep only Romanian locations
    │         (Bucharest, Cluj-Napoca, etc)
    ├── Fallback: "România" for unknown
    └── Format: lowercase tags, uppercase company
    │
    ▼
upsertJobs() - add/update jobs via API
    │
    ▼
delete stale jobs (in API but not in scrape results)
    │
    ▼
generateJobsMarkdown() → docs/jobs.md
    └── committed to repo by CI → available on GitHub Pages
```

## File Responsibilities

| File | Role |
|------|------|
| `config/company.json` | **Single source of truth** for company identity (CIF, brand, URLs, API params) |
| `config/company.js` | ESM wrapper that loads `config/company.json` for Node code |
| `scraper/index.js` | Main entry point - full workflow: validate company → scrape → transform → upsert → clean stale → generate docs/jobs.md |
| `scraper/company.js` | Validates company via ANAF + Peviitor; caches in root `company.json` (7-day TTL) |
| `scraper/api.js` | Peviitor API operations module - query, delete, upsert jobs + standalone commands |
| `scraper/validate-jobs.js` | Manual deep validator (content-aware); thin CLI wrapper over `job-validator.js` |
| `scraper/company-data.js` | ANAF API core module - searchCompany(brand) and getCompanyFromANAF(cif) with cuiscan.ro fallback (no retries) |
| `scraper/markdown-generator.js` | Generates `docs/jobs.md` with company info and all scraped jobs |
| `scraper/job-validator.js` | Shared validation primitives: `validateByHead`, `validateByContent`, `DEFAULT_EXPIRED_KEYWORDS` |
| `scraper/demoanaf.js` | CLI entry point for ANAF module (thin wrapper around company-data.js) |
| `tests/validate-axon-soft-jobs.js` | CI fast validator (HEAD only); thin CLI over `job-validator.js` + `api.js` |
| `tests/unit/index.test.js` | Unit tests for parseApiJobs, mapToJobModel, transformJobsForSOLR |
| `tests/unit/company.test.js` | Unit tests for validateAndGetCompany and fallback caching |
| `tests/unit/api.test.js` | Unit tests for API query, upsert, delete operations |
| `tests/unit/company-data.test.js` | Unit tests for ANAF/CUIScan search and company retrieval |
| `tests/integration/workflow.test.js` | Live integration tests - ANAF + Peviitor API |
| `tests/e2e/scraper.test.js` | End-to-end tests with real AXON SOFT API |
| `tests/consistency/public.test.js` | Verifies repo is public on GitHub |
| `tests/consistency/repo.test.js` | Verifies branch, Pages, workflow files |
| `tests/consistency/topics.test.js` | Verifies required repo topics |
| `tests/consistency/workflow-naming.test.js` | Validates workflow naming conventions |

## API Endpoints

- **DemoANAF Search**: `https://demoanaf.ro/api/search?q=BRAND` - Search companies by name/brand
- **DemoANAF Company**: `https://demoanaf.ro/api/company/:cui` - Get company details by CIF
- **CUIScan**: `https://cuiscan.ro/api/...` - Fallback when ANAF is unreachable
- **Peviitor API**: `https://api.peviitor.ro/v1/` - Jobs and company CRUD (no auth required)

## Rate Limiting & Politeness

The scraper is intentionally slow to be a good citizen:

| Setting | Value | Where |
|---------|-------|-------|
| Delay between pages | 1000 ms | `index.js` — `sleep(1000)` in `scrapeAllListings()` |
| Page size | 10 jobs | `index.js` — `PAGE_SIZE` constant |
| Max pages | 10 | `index.js` — `MAX_PAGES` in `scrapeAllListings()` |
| Request timeout | 10000 ms | `index.js` — `TIMEOUT` constant |
| ANAF attempts | 1 try ANAF → 1 try CUIScan fallback | `company-data.js` |
| Concurrency | 1 (sequential) | No `Promise.all` for paginated fetches |
| User-Agent | `job_seeker_ro_spider` | Identifies the scraper in server logs |

Derived scrapers should keep these defaults unless the target site explicitly permits otherwise.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_REPOSITORY` | Used by consistency tests — format: `owner/repo` |
| `GITHUB_TOKEN` | GitHub API token for consistency tests |

## Standalone Commands

```bash
# Verify jobs in API by CIF
node scraper/api.js <CIF>

# Get company details from ANAF by CIF
node scraper/demoanaf.js <CIF>

# Search companies in ANAF by brand
node scraper/demoanaf.js search <brand>

# Validate job URLs from API by CIF (check active/expired)
node scraper/validate-jobs.js <CIF>

# Validate a single job URL
node scraper/validate-jobs.js --url <url>

# Delete expired jobs from API by CIF
node scraper/validate-jobs.js <CIF> --delete
```

## Testing

This project requires multiple levels of testing:

1. **Unit Tests** - Test individual modules (api.js, company.js) in isolation
2. **Integration Tests** - Test API interactions (ANAF, Peviitor) in `/tests/integration` folder
3. **E2E Tests** - Test full workflow in `/tests/e2e` folder

Run tests:
```bash
npm test
```

## Temporary Files

All temporary/scratch files must be placed in `tmp/` inside the project root (never outside the project). The `tmp/` directory is in `.gitignore` and will not be committed.

## Technical Debt / Completed

- [x] Extract demoanaf.js to separate module (#2)
- [x] Write Unit Tests for all modules (#3)
- [x] Write Integration Tests in separate folder (#4)
- [x] Write E2E automated tests in separate folder (#5)
- [ ] Write Unit/Component/E2E tests for index.js