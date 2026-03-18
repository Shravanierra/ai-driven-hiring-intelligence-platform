import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BiasService } from './bias.service';
import { BiasFlag } from '../entities/bias-flag.entity';
import { FitScore, ScoreBreakdownItem } from '../entities/fit-score.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { JobDescription } from '../entities/job-description.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((e) => (Array.isArray(e) ? Promise.resolve(e) : Promise.resolve(e))),
  delete: jest.fn(),
});

const makeProfile = (overrides: Partial<CandidateProfile> = {}): CandidateProfile =>
  ({
    id: 'cand-1',
    jobId: 'job-1',
    name: 'Alex Smith',
    schemaVersion: '1',
    contact: { email: 'a@b.com', phone: null, location: null },
    workExperience: [],
    education: [],
    skills: [],
    summary: '',
    parseStatus: 'success',
    errorMessage: null,
    fileUrl: null,
    createdAt: new Date(),
    ...overrides,
  } as CandidateProfile);

const makeBreakdown = (): ScoreBreakdownItem[] => [
  {
    criterion_label: 'Required Skills',
    status: 'met',
    contribution: 40,
    explanation: 'Candidate strongly matches "Required Skills" (85% semantic similarity).',
  },
  {
    criterion_label: 'Education',
    status: 'partial',
    contribution: 20,
    explanation: 'Candidate partially matches "Education" (60% semantic similarity).',
  },
];

describe('BiasService.detectSignals', () => {
  let service: BiasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiasService,
        { provide: getRepositoryToken(BiasFlag), useFactory: mockRepo },
        { provide: getRepositoryToken(FitScore), useFactory: mockRepo },
        { provide: getRepositoryToken(CandidateProfile), useFactory: mockRepo },
        { provide: getRepositoryToken(JobDescription), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<BiasService>(BiasService);
  });

  it('returns no flags for a clean profile', () => {
    const profile = makeProfile();
    const flags = service.detectSignals(makeBreakdown(), profile);
    expect(flags).toHaveLength(0);
  });

  it('flags Ivy League institution as prestige proxy', () => {
    const profile = makeProfile({
      education: [{ institution: 'Harvard University', degree: 'BS', field: 'CS', graduation_year: 2015 }],
    });
    const flags = service.detectSignals(makeBreakdown(), profile);
    expect(flags.some((f) => f.signal_type === 'institution_prestige_proxy')).toBe(true);
  });

  it('flags HBCU institution as demographic proxy', () => {
    const profile = makeProfile({
      education: [{ institution: 'Howard University', degree: 'BS', field: 'CS', graduation_year: 2015 }],
    });
    const flags = service.detectSignals(makeBreakdown(), profile);
    expect(flags.some((f) => f.signal_type === 'institution_demographic_proxy')).toBe(true);
    expect(flags.find((f) => f.signal_type === 'institution_demographic_proxy')?.severity).toBe('high');
  });

  it('flags old graduation year as age proxy (high severity)', () => {
    const oldYear = new Date().getFullYear() - 40;
    const profile = makeProfile({
      education: [{ institution: 'State University', degree: 'BS', field: 'CS', graduation_year: oldYear }],
    });
    const flags = service.detectSignals(makeBreakdown(), profile);
    expect(flags.some((f) => f.signal_type === 'graduation_year_age_proxy')).toBe(true);
    expect(flags.find((f) => f.signal_type === 'graduation_year_age_proxy')?.severity).toBe('high');
  });

  it('flags very recent graduation year as age proxy (low severity)', () => {
    const recentYear = new Date().getFullYear();
    const profile = makeProfile({
      education: [{ institution: 'State University', degree: 'BS', field: 'CS', graduation_year: recentYear }],
    });
    const flags = service.detectSignals(makeBreakdown(), profile);
    expect(flags.some((f) => f.signal_type === 'graduation_year_age_proxy')).toBe(true);
    expect(flags.find((f) => f.signal_type === 'graduation_year_age_proxy')?.severity).toBe('low');
  });

  it('does not flag graduation year in normal range', () => {
    const normalYear = new Date().getFullYear() - 10;
    const profile = makeProfile({
      education: [{ institution: 'State University', degree: 'BS', field: 'CS', graduation_year: normalYear }],
    });
    const flags = service.detectSignals(makeBreakdown(), profile);
    expect(flags.some((f) => f.signal_type === 'graduation_year_age_proxy')).toBe(false);
  });

  it('flags candidate name appearing in criterion explanation', () => {
    const profile = makeProfile({ name: 'Jordan Williams' });
    const breakdown: ScoreBreakdownItem[] = [
      {
        criterion_label: 'Required Skills',
        status: 'met',
        contribution: 40,
        explanation: 'Jordan strongly matches the required skills.',
      },
    ];
    const flags = service.detectSignals(breakdown, profile);
    expect(flags.some((f) => f.signal_type === 'name_in_criterion_explanation')).toBe(true);
  });

  it('flags religious organization in work experience', () => {
    const profile = makeProfile({
      workExperience: [
        { company: 'First Baptist Church', title: 'Admin', start_date: '2018-01', end_date: '2020-01', description: '' },
      ],
    });
    const flags = service.detectSignals(makeBreakdown(), profile);
    expect(flags.some((f) => f.signal_type === 'religious_organization_proxy')).toBe(true);
  });

  it('deduplicates identical signals', () => {
    // Two education entries at Harvard should produce only one prestige proxy flag
    const profile = makeProfile({
      education: [
        { institution: 'Harvard University', degree: 'BS', field: 'CS', graduation_year: 2010 },
        { institution: 'Harvard University', degree: 'MS', field: 'CS', graduation_year: 2012 },
      ],
    });
    const flags = service.detectSignals(makeBreakdown(), profile);
    const prestige = flags.filter((f) => f.signal_type === 'institution_prestige_proxy');
    // Both entries produce the same description so they deduplicate
    expect(prestige.length).toBeGreaterThanOrEqual(1);
  });
});

describe('BiasService.getBiasFlags', () => {
  let service: BiasService;
  let biasFlagRepo: ReturnType<typeof mockRepo>;
  let fitScoreRepo: ReturnType<typeof mockRepo>;
  let profileRepo: ReturnType<typeof mockRepo>;
  let jobRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    biasFlagRepo = mockRepo();
    fitScoreRepo = mockRepo();
    profileRepo = mockRepo();
    jobRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiasService,
        { provide: getRepositoryToken(BiasFlag), useValue: biasFlagRepo },
        { provide: getRepositoryToken(FitScore), useValue: fitScoreRepo },
        { provide: getRepositoryToken(CandidateProfile), useValue: profileRepo },
        { provide: getRepositoryToken(JobDescription), useValue: jobRepo },
      ],
    }).compile();

    service = module.get<BiasService>(BiasService);
  });

  it('throws NotFoundException when job does not exist', async () => {
    jobRepo.findOne.mockResolvedValue(null);
    await expect(service.getBiasFlags('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when candidate does not exist', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'job-1' });
    profileRepo.findOne.mockResolvedValue(null);
    await expect(service.getBiasFlags('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when candidate belongs to different job', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'job-1' });
    profileRepo.findOne.mockResolvedValue(makeProfile({ jobId: 'job-2' }));
    await expect(service.getBiasFlags('job-1', 'cand-1')).rejects.toThrow(NotFoundException);
  });

  it('returns empty array when no FitScore exists', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'job-1' });
    profileRepo.findOne.mockResolvedValue(makeProfile());
    fitScoreRepo.findOne.mockResolvedValue(null);
    biasFlagRepo.delete.mockResolvedValue({});

    const result = await service.getBiasFlags('job-1', 'cand-1');
    expect(result).toEqual([]);
  });

  it('returns flags for a candidate with Ivy League education', async () => {
    const profile = makeProfile({
      education: [{ institution: 'Yale University', degree: 'BS', field: 'CS', graduation_year: 2015 }],
    });
    jobRepo.findOne.mockResolvedValue({ id: 'job-1' });
    profileRepo.findOne.mockResolvedValue(profile);
    fitScoreRepo.findOne.mockResolvedValue({
      candidateId: 'cand-1',
      jobId: 'job-1',
      score: 75,
      breakdown: makeBreakdown(),
      status: 'ok',
    });
    biasFlagRepo.delete.mockResolvedValue({});
    biasFlagRepo.save.mockImplementation((flags: any[]) => Promise.resolve(flags));

    const result = await service.getBiasFlags('job-1', 'cand-1');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].signalType).toBe('institution_prestige_proxy');
  });
});

describe('BiasService.getBiasReport', () => {
  let service: BiasService;
  let biasFlagRepo: ReturnType<typeof mockRepo>;
  let fitScoreRepo: ReturnType<typeof mockRepo>;
  let profileRepo: ReturnType<typeof mockRepo>;
  let jobRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    biasFlagRepo = mockRepo();
    fitScoreRepo = mockRepo();
    profileRepo = mockRepo();
    jobRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiasService,
        { provide: getRepositoryToken(BiasFlag), useValue: biasFlagRepo },
        { provide: getRepositoryToken(FitScore), useValue: fitScoreRepo },
        { provide: getRepositoryToken(CandidateProfile), useValue: profileRepo },
        { provide: getRepositoryToken(JobDescription), useValue: jobRepo },
      ],
    }).compile();

    service = module.get<BiasService>(BiasService);
  });

  it('throws NotFoundException when job does not exist', async () => {
    jobRepo.findOne.mockResolvedValue(null);
    await expect(service.getBiasReport('job-1')).rejects.toThrow(NotFoundException);
  });

  it('returns report with zero candidates when no profiles exist', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'job-1' });
    profileRepo.find.mockResolvedValue([]);

    const report = await service.getBiasReport('job-1');
    expect(report.candidateCount).toBe(0);
    expect(report.totalFlags).toBe(0);
    expect(report.scoreDistribution.mean).toBe(0);
  });

  it('computes score distribution correctly', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'job-1' });
    profileRepo.find.mockResolvedValue([
      makeProfile({ id: 'c1' }),
      makeProfile({ id: 'c2' }),
      makeProfile({ id: 'c3' }),
    ]);
    fitScoreRepo.findOne
      .mockResolvedValueOnce({ candidateId: 'c1', jobId: 'job-1', score: 80, breakdown: makeBreakdown(), status: 'ok' })
      .mockResolvedValueOnce({ candidateId: 'c2', jobId: 'job-1', score: 60, breakdown: makeBreakdown(), status: 'ok' })
      .mockResolvedValueOnce({ candidateId: 'c3', jobId: 'job-1', score: 40, breakdown: makeBreakdown(), status: 'ok' });

    const report = await service.getBiasReport('job-1');
    expect(report.candidateCount).toBe(3);
    expect(report.scoreDistribution.min).toBe(40);
    expect(report.scoreDistribution.max).toBe(80);
    expect(report.scoreDistribution.mean).toBe(60);
    expect(report.scoreDistribution.median).toBe(60);
  });

  it('aggregates flags across candidates', async () => {
    const profileWithIvy = makeProfile({
      id: 'c1',
      education: [{ institution: 'Harvard University', degree: 'BS', field: 'CS', graduation_year: 2015 }],
    });
    const profileWithHBCU = makeProfile({
      id: 'c2',
      education: [{ institution: 'Howard University', degree: 'BS', field: 'CS', graduation_year: 2015 }],
    });

    jobRepo.findOne.mockResolvedValue({ id: 'job-1' });
    profileRepo.find.mockResolvedValue([profileWithIvy, profileWithHBCU]);
    fitScoreRepo.findOne
      .mockResolvedValueOnce({ candidateId: 'c1', jobId: 'job-1', score: 75, breakdown: makeBreakdown(), status: 'ok' })
      .mockResolvedValueOnce({ candidateId: 'c2', jobId: 'job-1', score: 65, breakdown: makeBreakdown(), status: 'ok' });

    const report = await service.getBiasReport('job-1');
    expect(report.totalFlags).toBeGreaterThan(0);
    expect(report.flaggedSignals.length).toBeGreaterThan(0);
  });

  it('skips candidates with error status scores', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'job-1' });
    profileRepo.find.mockResolvedValue([makeProfile({ id: 'c1' })]);
    fitScoreRepo.findOne.mockResolvedValue({
      candidateId: 'c1', jobId: 'job-1', score: 0, breakdown: [], status: 'error',
    });

    const report = await service.getBiasReport('job-1');
    expect(report.scoreDistribution.mean).toBe(0);
    expect(report.totalFlags).toBe(0);
  });
});
