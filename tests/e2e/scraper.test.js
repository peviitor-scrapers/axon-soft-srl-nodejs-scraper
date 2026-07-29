import { jest } from '@jest/globals';
import fetch from 'node-fetch';
import companyConfig from '../../scraper/config/company.js';

const TEST_CIF = companyConfig.id;
const CAREER_URL = companyConfig.career[0];

describe('E2E: Full Scraping Pipeline', () => {

  describe('Axon Soft Careers Page — Real Data Fetch', () => {
    let html;

    beforeAll(async () => {
      const res = await fetch(CAREER_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept': 'text/html'
        }
      });
      html = await res.text();
    }, 15000);

    it('should load the careers page', () => {
      expect(html).toContain('Careers');
      expect(html).toContain('Axon Soft');
    });

    it('should have job listing panels', () => {
      expect(html).toContain('fusion-panel');
      expect(html).toContain('fusion-toggle-heading');
    });

    it('should contain job titles', () => {
      expect(html).toContain('Java');
      expect(html).toContain('QA');
    });
  });

  describe('Parse Pipeline', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../scraper/index.js');
    }, 60000);

    it('should parse real careers page HTML into job listings', async () => {
      const res = await fetch(CAREER_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept': 'text/html'
        }
      });
      const html = await res.text();
      const jobs = index.parseCareerPage(html);

      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);

      const job = jobs[0];
      expect(job).toHaveProperty('url');
      expect(job.url).toContain('axon-soft.com');
      expect(job).toHaveProperty('title');
    }, 15000);

    it('should map parsed jobs to job model', async () => {
      const res = await fetch(CAREER_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept': 'text/html'
        }
      });
      const html = await res.text();
      const jobs = index.parseCareerPage(html);
      const model = index.mapToJobModel(jobs[0], TEST_CIF);

      expect(model).toHaveProperty('url');
      expect(model).toHaveProperty('title');
      expect(model).toHaveProperty('company');
      expect(model).toHaveProperty('cif', TEST_CIF);
      expect(model).toHaveProperty('status', 'scraped');
      expect(model).toHaveProperty('date');
    }, 15000);

    it('should produce valid job URLs that are accessible', async () => {
      const res = await fetch(CAREER_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept': 'text/html'
        }
      });
      const html = await res.text();
      const jobs = index.parseCareerPage(html);

      for (const job of jobs.slice(0, 2)) {
        const jobRes = await fetch(job.url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'job_seeker_ro_spider' }
        });
        expect(jobRes.ok).toBe(true);
      }
    }, 30000);
  });

  describe('Company Validation Path', () => {
    let anaf;
    let company;

    beforeAll(async () => {
      anaf = await import('../../scraper/company-data.js');
      company = await import('../../scraper/company.js');
    }, 60000);

    it('should find Axon Soft in ANAF and validate active status', async () => {
      const results = await anaf.searchCompany('AXON SOFT');

      const target = results.find(c =>
        c.cui.toString() === TEST_CIF
      );
      expect(target).toBeDefined();
      expect(target.cui.toString()).toBe(TEST_CIF);

      const anafData = await anaf.getCompanyFromANAF(TEST_CIF);
      expect(anafData).toBeDefined();
      expect(anafData.inactive).toBe(false);
    }, 30000);

    it('should run full validation and report active status with job count', async () => {
      const result = await company.validateAndGetCompany();

      expect(result.status).toBe('active');
      expect(result.company).toBe('AXON SOFT SRL');
      expect(result.cif).toBe(TEST_CIF);

      if (result.existingJobsCount === 0) {
        console.log('⚠️ No Axon Soft jobs — skipping job count assertion');
        return;
      }
      expect(result.existingJobsCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Data Verification', () => {
    let api;

    beforeAll(async () => {
      api = await import('../../scraper/api.js');
    });

    it('should have Axon Soft jobs with correct company name', async () => {
      const result = await api.querySOLR(TEST_CIF);

      if (result.numFound === 0) {
        console.log('⚠️ No Axon Soft jobs — skipping data verification');
        return;
      }

      for (const job of result.docs) {
        expect(job.company).toBe('AXON SOFT SRL');
        expect(job.cif).toBe(TEST_CIF);
      }
    }, 15000);

    it('should have Axon Soft company core entry with required fields', async () => {
      const result = await api.queryCompanySOLR(`id:${TEST_CIF}`);

      expect(result.numFound).toBe(1);
      const comp = result.docs[0];
      expect(comp.company).toBe('AXON SOFT SRL');
      expect(comp.status).toBe('activ');
    }, 15000);
  });
});
