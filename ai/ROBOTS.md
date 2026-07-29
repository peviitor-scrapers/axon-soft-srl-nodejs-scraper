# robots.txt Analysis for Axon Soft

Source: https://axon-soft.com/robots.txt

```
User-agent: LinkedInBot
Disallow: /

Disallow: /wp-includes/
Disallow: /wp-content/plugins/

User-agent: *
Disallow:

Sitemap: https://axon-soft.com/sitemap_index.xml
```

## Summary

- **General crawlers (`*`):** Fully allowed (no disallowed paths)
- **LinkedInBot:** Blocked entirely
- `/wp-includes/` and `/wp-content/plugins/` are blocked (WordPress internals — not relevant to job scraping)
- **Careers page** (`/careers/`) is **allowed**
- **Job detail pages** (`/qa-automation/`, `/backend-java/`, etc.) are **allowed**

The scraper respects these rules:
- Fetches only `/careers/` and individual job pages for parsing
- Uses `job_seeker_ro_spider` as User-Agent
- Includes rate limiting (1s delay between requests)
