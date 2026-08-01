# job_seeker_ro_spider

**job_seeker_ro_spider** — scraper pentru job-urile AXON SOFT Systems din România.

Extrage anunțurile de pe [AXON SOFT Careers Romania](https://axon-soft.com/en/jobs/romania) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul SOLR.

## Identificare

Toate request-urile HTTP folosesc User-Agent-ul:

```
job_seeker_ro_spider
```

## Ce face

1. **Validează compania** — interoghează API-ul public ANAF ([demoanaf.ro](https://demoanaf.ro)) după CIF-ul AXON SOFT (13049596) și verifică:
   - Denumirea oficială: AXON SOFT SYSTEMS INTERNATIONAL SRL
   - Status: activ/inactiv/radiat
   - Adresa completă din registrul comerțului
2. **Cross-validează cu Peviitor** — verifică existența companiei în API-ul Peviitor
3. **Scrape-uiește job-urile** — extrage lista completă de job-uri din API-ul public AXON SOFT Careers, filtrat pe România
4. **Transformă datele** — normalizează locațiile (doar orașe românești), tag-urile (lowercase), workmode-ul (remote/on-site/hybrid)
5. **Stochează în API Peviitor** — upsert/delete prin REST API
6. **Generează docs/jobs.md** — fișier markdown cu informații companie + toate job-urile curente, publicat pe [GitHub Pages](https://sebiboga.github.io/axon-soft-srl-nodejs-scraper/jobs.md)

## Structură proiect

```
├── config/company.json             # Sursa unică de adevăr (CIF, brand, URL-uri, API)
├── config/company.js               # Loader ESM pentru config/company.json
├── scraper/
│   ├── index.js                    # Orchestrator principal
│   ├── company.js                  # Validare companie (ANAF + Peviitor) cu cache 7 zile
│   ├── api.js                      # Operații API Peviitor (query, upsert, delete)
│   ├── anaf.js                       # Modul ANAF API (search + company details)
│   ├── markdown-generator.js       # Generează docs/jobs.md după scrape
│   ├── job-validator.js            # Primitivă comună: validateByHead, validateByContent
│   ├── validate-jobs.js            # Validator manual de job-uri (deep check)
│   └── demoanaf.js                 # CLI wrapper pentru scraper/anaf.js
├── ROBOTS.md          # Analiză robots.txt și politici de scraping
├── tests/
│   ├── unit/          # Teste unitare (API-uri mock-uite)
│   ├── integration/   # Teste de integrare (ANAF + Peviitor live)
│   ├── e2e/           # Teste end-to-end (pipelin complet)
│   ├── consistency/   # Teste de consistență (branch, Pages, topic-uri)
│   └── validate-axon-soft-jobs.js  # Validator CI rapid (HEAD only)
└── .github/workflows/
    ├── job-seeker-ro-spider.yml     # Rulează zilnic la 6 AM UTC
    └── automation-testing.yml       # Teste automate la fiecare push/PR
```

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| AXON SOFT Careers | `https://axon-soft.com/api/jobs/v2/search/...` | Public |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| CUIScan | `https://cuiscan.ro/api/...` | Public |
| Peviitor | `https://api.peviitor.ro/v1/` | Public |

## Robots.txt

AXON SOFT Careers [robots.txt](https://axon-soft.com/robots.txt) dezactivează:
- `/api/*` — API-ul JSON folosit de scraper
- `/*/vacancy/*` — paginile individuale de job

Scraper-ul folosește API-ul cu rate limiting (1s delay între pagini, 10 job-uri/cerere) și un singur User-Agent identificabil. Paginile individuale de job sunt doar verificate (HEAD request), nu parse-uite.

Pentru analiza completă, vezi [ROBOTS.md](../ROBOTS.md).

## 🌱 Derived Scrapers

Acest template a fost folosit pentru a deriva scraper-e pentru alte companii:

| Repo | Companie | CIF | Metodă | Status |
|------|----------|-----|--------|--------|
| [mejix-srl-nodejs-scraper](https://github.com/sebiboga/mejix-srl-nodejs-scraper) | MEJIX SRL | 17372688 | HTML scraping (cheerio) | ✅ Live |
| [talent-matchmakers-srl-nodejs-scraper](https://github.com/sebiboga/talent-matchmakers-srl-nodejs-scraper) | TALENT MATCHMAKERS S.R.L. | 38460545 | Teamtailor HTML (cheerio) | ✅ Live |
| [artsoft-consult-srl-nodejs-scraper](https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper) | ARTSOFT CONSULT SRL | 15997630 | HTML scraping (cheerio) | ✅ Live |
| [rapel-srl-nodejs-scraper](https://github.com/sebiboga/rapel-srl-nodejs-scraper) | RAPEL SRL | 5665609 | jobRapid.ro HTML + ANOFM API | ✅ Live |
| [continental-hotels-srl-nodejs-scraper](https://github.com/sebiboga/continental-hotels-srl-nodejs-scraper) | CONTINENTAL HOTELS SA | 1559737 | POST AJAX → HTML (cheerio) | ✅ Live |
| [coera-bc-srl-nodejs-scraper](https://github.com/sebiboga/coera-bc-srl-nodejs-scraper) | COERA BC SRL | 32519996 | HTML scraping (cheerio) | ✅ Live |

**Pitfall #12 — ANOFM job scraping by CIF:** API-ul public ANOFM (`/api/entity/vw_public_job_posting`) oferă job-uri gratis filtrate pe CIF. Adăugați `searchANOFM(cif)` în scraper pentru a nu pierde job-uri de pe această platformă. Location se returnează ca array (`[loc]`).

## Testare

```bash
# Toate testele
npm test

# Doar unitare
npm run test:unit

# Doar integrare (necesită ANAF live, SOLR conditional)
npm run test:integration

# Doar E2E (API real AXON SOFT + ANAF + SOLR)
npm run test:e2e
```

Testele de integrare folosesc `itIfApi`/`itIfAnaf` — se auto-skip dacă API-ul nu e disponibil.
