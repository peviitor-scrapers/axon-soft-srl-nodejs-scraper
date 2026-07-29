import { jest } from '@jest/globals';

describe('index.js Component Tests', () => {
  let index;

  beforeAll(async () => {
    index = await import('../../scraper/index.js');
  });

  describe('transformJobsForSOLR', () => {
    it('should filter locations to only Romanian cities', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['România'] },
          { url: 'https://test.com/2', title: 'Job 2', location: ['Cluj-Napoca'] },
          { url: 'https://test.com/3', title: 'Job 3', location: ['Bulgaria'] },
          { url: 'https://test.com/4', title: 'Job 4', location: ['Cluj-Napoca'] },
          { url: 'https://test.com/5', title: 'Job 5', location: [] }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].location).toEqual(['România']);
      expect(result.jobs[1].location).toEqual(['Cluj-Napoca']);
      expect(result.jobs[2].location).toEqual(['România']);
      expect(result.jobs[3].location).toEqual(['Cluj-Napoca']);
      expect(result.jobs[4].location).toEqual(['România']);
    });

    it('should keep company uppercase', () => {
      const payload = {
        source: 'axon-soft.com',
        company: 'axon soft srl',
        cif: '13049596',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', company: 'axon soft', cif: '13049596' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.company).toBe('AXON SOFT SRL');
    });

    it('should normalize workmode values', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', workmode: 'Remote' },
          { url: 'https://test.com/2', title: 'Job 2', workmode: 'ON-SITE' },
          { url: 'https://test.com/3', title: 'Job 3', workmode: 'Hybrid' },
          { url: 'https://test.com/4', title: 'Job 4', workmode: 'hybrid' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].workmode).toBe('remote');
      expect(result.jobs[1].workmode).toBe('on-site');
      expect(result.jobs[2].workmode).toBe('hybrid');
      expect(result.jobs[3].workmode).toBe('hybrid');
    });

    it('should handle empty jobs array', () => {
      const result = index.transformJobsForSOLR({ jobs: [] });
      expect(result.jobs).toEqual([]);
    });
  });

  describe('mapToJobModel', () => {
    it('should map raw job to job model format', () => {
      const rawJob = {
        url: 'https://axon-soft.com/qa-automation/',
        title: 'QA Automation Engineer',
        location: ['Cluj-Napoca'],
        tags: ['QA', 'Automation'],
        workmode: 'hybrid'
      };

      const COMPANY_NAME = 'AXON SOFT SRL';
      const COMPANY_CIF = '13049596';

      const result = index.mapToJobModel(rawJob, COMPANY_CIF, COMPANY_NAME);

      expect(result.url).toBe(rawJob.url);
      expect(result.title).toBe(rawJob.title);
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(COMPANY_CIF);
      expect(result.location).toEqual(rawJob.location);
      expect(result.tags).toEqual(rawJob.tags);
      expect(result.workmode).toBe(rawJob.workmode);
      expect(result.status).toBe('scraped');
      expect(result.date).toBeDefined();
    });

    it('should remove undefined fields', () => {
      const rawJob = {
        url: 'https://test.com/1',
        title: 'Job 1'
      };

      const result = index.mapToJobModel(rawJob, '13049596');

      expect(result.location).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.workmode).toBeUndefined();
    });

    it('should handle missing title', () => {
      const rawJob = { url: 'https://test.com/1' };

      const result = index.mapToJobModel(rawJob, '13049596');

      expect(result.title).toBeUndefined();
      expect(result.url).toBe('https://test.com/1');
    });
  });

  describe('parseCareerPage', () => {
    const sampleHtml = `<div class="fusion-panel panel-default">
      <div class="panel-heading">
        <h4 class="panel-title toggle">
          <span class="fusion-toggle-heading">QA Automation Engineer</span>
        </h4>
      </div>
      <div class="panel-collapse collapse">
        <div class="panel-body toggle-content">
          <p><a href="https://axon-soft.com/qa-automation/">Read more</a></p>
        </div>
      </div>
    </div>
    <div class="fusion-panel panel-default">
      <div class="panel-heading">
        <h4 class="panel-title toggle">
          <span class="fusion-toggle-heading">Java Backend Developer</span>
        </h4>
      </div>
      <div class="panel-collapse collapse">
        <div class="panel-body toggle-content">
          <p><a href="https://axon-soft.com/backend-java/">Read more</a></p>
        </div>
      </div>
    </div>`;

    it('should parse jobs from career page HTML', () => {
      const result = index.parseCareerPage(sampleHtml);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('QA Automation Engineer');
      expect(result[0].url).toBe('https://axon-soft.com/qa-automation/');
      expect(result[1].title).toBe('Java Backend Developer');
      expect(result[1].url).toBe('https://axon-soft.com/backend-java/');
    });

    it('should handle empty page', () => {
      const result = index.parseCareerPage('<html></html>');
      expect(result).toEqual([]);
    });
  });

  describe('parseJobDetail', () => {
    const sampleHtml = `<html><body><main><h1>QA Automation Engineer</h1>
      <p>We are looking for QA Automation Engineers</p>
    </main></body></html>`;

    it('should parse job detail page', () => {
      const baseJob = { url: 'https://axon-soft.com/qa-automation/', title: 'QA Automation Engineer' };
      const result = index.parseJobDetail(sampleHtml, baseJob);

      expect(result.url).toBe(baseJob.url);
      expect(result.title).toBe('QA Automation Engineer');
      expect(result.location).toEqual(['Cluj-Napoca']);
      expect(result.workmode).toBe('hybrid');
    });
  });
});
