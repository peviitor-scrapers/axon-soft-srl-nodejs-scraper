import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

function makeApiResponse(success, data, total) {
  return {
    ok: true,
    json: async () => ({ success, data, total })
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
  let api;

  beforeAll(async () => {
    api = await import('../../scraper/api.js');
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('querySOLR', () => {
    it('should return response object with docs', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, [
        { id: 'job1', url: 'https://test.com/1', cif: '13049596' },
        { id: 'job2', url: 'https://test.com/2', cif: '13049596' }
      ], 2));

      const result = await api.querySOLR('13049596');

      expect(result).toHaveProperty('numFound', 2);
      expect(result).toHaveProperty('docs');
      expect(Array.isArray(result.docs)).toBe(true);
      expect(result.docs).toHaveLength(2);
    });

    it('should return empty docs when no jobs found', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, [], 0));

      const result = await api.querySOLR('99999999');

      expect(result.numFound).toBe(0);
      expect(result.docs).toEqual([]);
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, 'Internal Server Error'));

      await expect(api.querySOLR('13049596')).rejects.toThrow('API jobs query error: 500');
    });
  });

  describe('queryCompanySOLR', () => {
    it('should return company data by ID query', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, [
        { id: '13049596', company: 'AXON SOFT SRL', brand: 'AXON SOFT' }
      ]));

      const result = await api.queryCompanySOLR('id:13049596');

      expect(result.numFound).toBe(1);
      expect(result.docs[0].brand).toBe('AXON SOFT');
    });

    it('should return empty when company not found', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, []));

      const result = await api.queryCompanySOLR('id:00000000');

      expect(result.numFound).toBe(0);
    });

    it('should query by company name', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, [
        { id: '13049596', company: 'AXON SOFT SRL', brand: 'AXON SOFT' }
      ]));

      const result = await api.queryCompanySOLR('company:AXON SOFT*');

      expect(result.numFound).toBe(1);
      expect(result.docs[0].company).toBe('AXON SOFT SRL');
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(401, 'Unauthorized'));

      await expect(api.queryCompanySOLR('id:13049596')).rejects.toThrow('API company query error: 401');
    });

    it('should throw on unsupported query format', async () => {
      await expect(api.queryCompanySOLR('unknown:format')).rejects.toThrow('Unsupported company query format');
    });
  });

  describe('upsertJobs', () => {
    it('should accept array of jobs', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, { count: 1 }));

      const testJob = {
        url: 'https://test.com/job1',
        title: 'Test Job',
        company: 'TEST COMPANY',
        cif: '12345678',
        status: 'scraped'
      };

      await expect(api.upsertJobs([testJob])).resolves.not.toThrow();
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(400, 'Bad Request'));

      await expect(api.upsertJobs([{ url: 'https://test.com/bad' }])).rejects.toThrow('API jobs upload error: 400');
    });
  });

  describe('deleteJobByUrl', () => {
    it('should delete a job by URL', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, { count: 1 }));

      await expect(api.deleteJobByUrl('https://test.com/old-job')).resolves.not.toThrow();
    });

    it('should handle 404 gracefully', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404, text: async () => '' });

      await expect(api.deleteJobByUrl('https://test.com/not-found')).resolves.not.toThrow();
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, 'Error'));

      await expect(api.deleteJobByUrl('https://test.com/bad')).rejects.toThrow('API jobs delete error: 500');
    });
  });

  describe('deleteJobsByCIF', () => {
    it('should delete all jobs for a CIF', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, { count: 3 }));

      await expect(api.deleteJobsByCIF('13049596')).resolves.not.toThrow();
    });

    it('should handle 404 gracefully', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404, text: async () => '' });

      await expect(api.deleteJobsByCIF('13049596')).resolves.not.toThrow();
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, 'Error'));

      await expect(api.deleteJobsByCIF('13049596')).rejects.toThrow('API jobs delete error: 500');
    });
  });

  describe('Data Integrity', () => {
    it('should not have duplicate URLs for same CIF', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, [
        { url: 'https://test.com/job1', title: 'Job 1', cif: '13049596' },
        { url: 'https://test.com/job2', title: 'Job 2', cif: '13049596' }
      ], 2));

      const result = await api.querySOLR('13049596');
      const urls = result.docs.map(j => j.url);
      const uniqueUrls = new Set(urls);

      expect(uniqueUrls.size).toBe(result.numFound);
    });

    it('should have valid CIF format for all jobs', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, [
        { url: 'https://test.com/1', title: 'Job 1', cif: '13049596' },
        { url: 'https://test.com/2', title: 'Job 2', cif: '1234567' }
      ], 2));

      const result = await api.querySOLR('13049596');

      for (const job of result.docs) {
        expect(job.cif).toMatch(/^\d{6,9}$/);
      }
    });

    it('should detect invalid CIF format', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(true, [
        { url: 'https://test.com/1', title: 'Job 1', cif: 'abc' }
      ], 1));

      const result = await api.querySOLR('abc');

      for (const job of result.docs) {
        expect(job.cif).not.toMatch(/^\d{6,9}$/);
      }
    });

    it('should have valid status values', async () => {
      const validStatuses = ['scraped', 'tested', 'verified', 'published'];

      mockFetch.mockResolvedValue(makeApiResponse(true, [
        { url: 'https://test.com/1', title: 'Job 1', cif: '13049596', status: 'scraped' },
        { url: 'https://test.com/2', title: 'Job 2', cif: '13049596', status: 'verified' },
        { url: 'https://test.com/3', title: 'Job 3', cif: '13049596', status: 'published' }
      ], 3));

      const result = await api.querySOLR('13049596');

      for (const job of result.docs) {
        expect(validStatuses).toContain(job.status);
      }
    });
  });
});
