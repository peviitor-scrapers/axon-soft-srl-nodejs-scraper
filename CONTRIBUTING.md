# Contributing to Axon Soft Scraper

Acest scraper face parte din ecosistemul [peviitor.ro](https://peviitor.ro). A fost derivat din [template-ul EPAM Systems International SRL](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper).

## About Derived Scrapers

This is a **derived scraper** — it was created from the EPAM template and customized for Axon Soft. All derived scrapers share the same architecture:

- `config/company.json` — single source of truth for company identity
- `index.js` — company-specific scraping logic
- `tests/` — comprehensive test suite (unit, integration, e2e, consistency)
- `.github/workflows/` — CI/CD pipelines

To derive a new scraper from the AXON SOFT template, see the template's CONTRIBUTING.md.
