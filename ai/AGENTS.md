# AI Agent Instructions for Axon Soft Scraper

## 🌱 This Repo Is a Derived Scraper

Aceste instrucțiuni sunt pentru agenții AI care întrețin acest scraper Axon Soft. A fost derivat din [template-ul AXON SOFT Systems International SRL](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper).

## Company Identity

- **Legal Name:** AXON SOFT SRL
- **Brand:** Axon Soft
- **CIF:** 13049596
- **Website:** https://axon-soft.com
- **Careers:** https://axon-soft.com/careers/
- **Scraping Method:** HTML/cheerio (WordPress Avada theme)
- **Default Location:** Cluj-Napoca

## Maintenance Notes

- Single source of truth: `config/company.json`
- All ANAF, Peviitor, and SOLR company references use the values above
- Tests use dynamic imports from `config/company.js` (no hardcoded CIF/brand in most test files)
