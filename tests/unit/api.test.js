import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

function makeJsonResponse(body) {
  return {
    ok: true,
    json: async () => body
  };
}

function makeErrorResponse(status, text) {
  return {
    ok: false,
    status,
    text: async () => text
  };
}

describe('scraper/api.js', () => {
  let solr;

  beforeAll(async () => {
    solr = await import('../../scraper/api.js');
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('querySOLR', () => {
    it('should return response object with docs', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({
        total: 2,
        data: [
          { id: 'job1', url: 'https://test.com/1', cif: '13049596' },
          { id: 'job2', url: 'https://test.com/2', cif: '13049596' }
        ]
      }));

      const result = await solr.querySOLR('13049596');

      expect(result).toHaveProperty('numFound', 2);
      expect(result).toHaveProperty('docs');
      expect(Array.isArray(result.docs)).toBe(true);
      expect(result.docs).toHaveLength(2);
    });

    it('should return empty docs when no jobs found', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ total: 0, data: [] }));

      const result = await solr.querySOLR('99999999');

      expect(result.numFound).toBe(0);
      expect(result.docs).toEqual([]);
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, 'Internal Server Error'));

      await expect(solr.querySOLR('13049596')).rejects.toThrow('API jobs query error: 500');
    });
  });

  describe('getCompanyByCif', () => {
    it('should return company data by CIF', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({
        success: true,
        data: [{ id: '13049596', company: 'AXON SOFT SRL', brand: 'AXON SOFT' }]
      }));

      const result = await solr.getCompanyByCif('13049596');

      expect(result).not.toBeNull();
      expect(result.id).toBe('13049596');
      expect(result.company).toBe('AXON SOFT SRL');
    });

    it('should return null when company not found', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ success: true, data: [] }));

      const result = await solr.getCompanyByCif('00000000');

      expect(result).toBeNull();
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(401, 'Unauthorized'));

      await expect(solr.getCompanyByCif('13049596')).rejects.toThrow('API company search error: 401');
    });

    it('should throw when API returns error', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ success: false, message: 'Error' }));

      await expect(solr.getCompanyByCif('13049596')).rejects.toThrow('API company search failed');
    });
  });

  describe('searchCompanyByName', () => {
    it('should return companies by name', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({
        success: true,
        data: [{ id: '13049596', company: 'AXON SOFT SRL', brand: 'AXON SOFT' }]
      }));

      const results = await solr.searchCompanyByName('AXON SOFT');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].company).toBe('AXON SOFT SRL');
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, 'Error'));

      await expect(solr.searchCompanyByName('AXON SOFT')).rejects.toThrow('API company search error: 500');
    });
  });

  describe('upsertJobs', () => {
    it('should accept array of jobs', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ count: 1 }));

      const testJob = {
        url: 'https://test.com/job1',
        title: 'Test Job',
        company: 'TEST COMPANY',
        cif: '12345678',
        status: 'scraped'
      };

      await expect(solr.upsertJobs([testJob])).resolves.not.toThrow();
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(400, 'Bad Request'));

      await expect(solr.upsertJobs([{ url: 'https://test.com/bad' }])).rejects.toThrow('API jobs upload error: 400');
    });
  });

  describe('deleteJobByUrl', () => {
    it('should delete a job by URL', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ success: true }));

      await expect(solr.deleteJobByUrl('https://test.com/old-job')).resolves.not.toThrow();
    });

    it('should handle 404 gracefully', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404, text: async () => '' });

      await expect(solr.deleteJobByUrl('https://test.com/not-found')).resolves.not.toThrow();
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, 'Error'));

      await expect(solr.deleteJobByUrl('https://test.com/bad')).rejects.toThrow('API jobs delete error: 500');
    });
  });

  describe('deleteJobsByCIF', () => {
    it('should delete all jobs for a CIF', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ count: 3 }));

      await expect(solr.deleteJobsByCIF('13049596')).resolves.not.toThrow();
    });

    it('should handle 404 gracefully', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404, text: async () => '' });

      await expect(solr.deleteJobsByCIF('13049596')).resolves.not.toThrow();
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, 'Error'));

      await expect(solr.deleteJobsByCIF('13049596')).rejects.toThrow('API jobs delete error: 500');
    });
  });

  describe('Data Integrity', () => {
    it('should not have duplicate URLs for same CIF', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({
        total: 2,
        data: [
          { url: 'https://test.com/job1', title: 'Job 1', cif: '13049596' },
          { url: 'https://test.com/job2', title: 'Job 2', cif: '13049596' }
        ]
      }));

      const result = await solr.querySOLR('13049596');
      const urls = result.docs.map(j => j.url);
      const uniqueUrls = new Set(urls);

      expect(uniqueUrls.size).toBe(result.numFound);
    });

    it('should have valid CIF format for all jobs', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({
        total: 2,
        data: [
          { url: 'https://test.com/1', title: 'Job 1', cif: '13049596' },
          { url: 'https://test.com/2', title: 'Job 2', cif: '12345678' }
        ]
      }));

      const result = await solr.querySOLR('13049596');

      for (const job of result.docs) {
        expect(job.cif).toMatch(/^\d{6,9}$/);
      }
    });

    it('should detect invalid CIF format', async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({
        total: 1,
        data: [
          { url: 'https://test.com/1', title: 'Job 1', cif: 'abc' }
        ]
      }));

      const result = await solr.querySOLR('abc');

      for (const job of result.docs) {
        expect(job.cif).not.toMatch(/^\d{6,9}$/);
      }
    });

    it('should have valid status values', async () => {
      const validStatuses = ['scraped', 'tested', 'verified', 'published'];

      mockFetch.mockResolvedValue(makeJsonResponse({
        total: 3,
        data: [
          { url: 'https://test.com/1', title: 'Job 1', cif: '13049596', status: 'scraped' },
          { url: 'https://test.com/2', title: 'Job 2', cif: '13049596', status: 'verified' },
          { url: 'https://test.com/3', title: 'Job 3', cif: '13049596', status: 'published' }
        ]
      }));

      const result = await solr.querySOLR('13049596');

      for (const job of result.docs) {
        expect(validStatuses).toContain(job.status);
      }
    });
  });
});
