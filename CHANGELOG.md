# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.2] - 2026-08-01

### Added
- Derived from the [EPAM template](https://github.com/epam-systems-international-srl-nodejs-scraper) v1.5.2 baseline.
- Missing template files aligned: `.github/workflows/automation-template-sync-check.yml`, `.github/workflows/job-deep-validate.yml`, `.github/workflows/job-recovery-from-disaster.yml`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `ai/AI-DERIVATION-GUIDE.md`, `ai/MAINTENANCE.md`, `scraper/config/scraper.json`, `scraper/config/scraper.js`.

### Changed
- `scraper/company-data.js` → `scraper/anaf.js` (module rename; imports updated).
- `tests/unit/company-data.test.js` → `tests/unit/demoanaf.test.js`.
- `job-seeker-ro-spider.yml`: added "Ensure company exists in company core" step.

### Removed
- Legacy root `delete_request.json`.

### Fixed
- `scraper/index.js`: imported `deleteJobsByCIF` (was called but never imported).
- node-fetch v3 `timeout` option replaced with `signal: AbortSignal.timeout(...)` on all fetches.
- Removed dead `--test` parameter.

## [1.0.0] - 2025-xx-xx

### Added
- Initial AXON SOFT scraper (careers page + ANOFM, deduplicated by URL).
