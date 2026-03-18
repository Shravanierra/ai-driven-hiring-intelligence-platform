# Implementation Plan: AI Hiring Platform

## Overview

Incremental implementation of the AI-powered ATS backend (NestJS/TypeScript) and frontend (React/TypeScript + Vite). Each task builds on the previous, wiring components together progressively. All AI interactions go through a shared LLM client abstraction.

## Tasks

- [x] 1. Project scaffolding and shared infrastructure
  - Scaffold NestJS monorepo backend and React+Vite frontend with TypeScript configs
  - Set up Docker Compose with PostgreSQL (pgvector extension), Redis, and MinIO services
  - Configure TypeORM with database connection and enable pgvector extension migration
  - Create shared LLM client abstraction wrapping OpenAI SDK (embeddings + chat completions) with retry logic (3 attempts, exponential backoff) and 503 fallback
  - Define all TypeORM entity classes matching the data models: JobDescription, ScreeningCriteria, CandidateProfile, FitScore, ShortlistEntry, BiasFlag, InterviewKit, AssistantSession
  - Set up Jest + fast-check for property-based testing in both backend and frontend
  - _Requirements: 1.1, 2.1, 3.1, 8.1_

- [ ] 2. Job Description Ingestion and Screening Criteria
  - [x] 2.1 Implement JobsModule with file upload, parsing, and persistence
    - Create `POST /jobs` endpoint accepting PDF/DOCX/plain-text via multipart upload; use pdf-parse and mammoth for extraction; store raw_text and file_url (MinIO); set status to pending→parsed or error
    - Implement `GET /jobs/{job_id}` to retrieve a JobDescription record
    - Return HTTP 422 with `{ error: "unsupported_format" | "parse_failure", detail: "..." }` for bad files
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Implement Screening Criteria generation and CRUD
    - On successful JD parse, call LLM (GPT-4o) to extract required_skills, preferred_skills, experience_level, responsibilities, and custom_criteria; persist as ScreeningCriteria with version=1
    - Implement `PUT /jobs/{job_id}/criteria` and `GET /jobs/{job_id}/criteria` endpoints
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 2.3 Write property test for JD parsing produces complete screening criteria
    - **Property 1: JD Parsing Produces Complete Screening Criteria**
    - **Validates: Requirements 1.2**

  - [x] 2.4 Write property test for criteria save-retrieve round trip
    - **Property 2: Criteria Save-Retrieve Round Trip**
    - **Validates: Requirements 1.5**

- [ ] 3. Resume Ingestion and Candidate Profile Extraction
  - [x] 3.1 Implement ResumesModule with batch upload and parsing
    - Create `POST /jobs/{job_id}/resumes` accepting multipart batch (up to 500 files); parse each with pdf-parse/mammoth; on parse failure set parse_status="error" and continue; return `{ profiles: [...], failures: [...] }`
    - Implement `GET /jobs/{job_id}/candidates` and `GET /candidates/{candidate_id}` endpoints
    - _Requirements: 2.1, 2.3, 2.4, 2.6_

  - [x] 3.2 Implement Skill_Extractor with canonical normalization
    - Call LLM to extract skills from resume text; build a canonical skill map (e.g., "K8s" → "Kubernetes"); store skills array with canonical_name and raw_aliases on CandidateProfile
    - _Requirements: 2.2_

  - [x] 3.3 Implement Summary_Generator for candidate profiles
    - After profile extraction, call LLM to generate a human-readable summary; store in CandidateProfile.summary; ensure summary is non-empty
    - _Requirements: 2.5_

  - [ ]* 3.4 Write property test for resume parsing produces complete candidate profile
    - **Property 3: Resume Parsing Produces Complete Candidate Profile**
    - **Validates: Requirements 2.1**

  - [ ]* 3.5 Write property test for skill normalization maps aliases to same canonical name
    - **Property 4: Skill Normalization Maps Aliases to Same Canonical Name**
    - **Validates: Requirements 2.2**

  - [ ]* 3.6 Write property test for summary generated for every profile
    - **Property 5: Summary Generated for Every Profile**
    - **Validates: Requirements 2.5**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Fit Scoring Service
  - [x] 5.1 Implement FitScoringModule with embedding-based scoring
    - Implement `POST /jobs/{job_id}/candidates/{candidate_id}/score`: generate embeddings for candidate profile and screening criteria via OpenAI `text-embedding-ada-002`; compute cosine similarity; produce score (0–100) and breakdown array (one entry per criterion with status met/partial/not_met, contribution, explanation)
    - Implement `GET /jobs/{job_id}/candidates/{candidate_id}/score` to retrieve FitScore
    - Store criteria_version on FitScore to track which criteria version was used
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.2 Implement bulk rescore on criteria update
    - Implement `POST /jobs/{job_id}/rescore`: recompute FitScores for all candidates under the job; complete within 60 seconds; mark failed records with status="error" rather than aborting the batch
    - Increment ScreeningCriteria.version on each PUT /criteria save; trigger rescore automatically
    - _Requirements: 3.4_

  - [ ]* 5.3 Write property test for fit score is always in range [0, 100]
    - **Property 6: Fit Score Is Always in Range [0, 100]**
    - **Validates: Requirements 3.1**

  - [ ]* 5.4 Write property test for score breakdown covers all criteria
    - **Property 7: Score Breakdown Covers All Criteria**
    - **Validates: Requirements 3.2**

  - [ ]* 5.5 Write property test for criteria update triggers rescore for all candidates
    - **Property 8: Criteria Update Triggers Rescore for All Candidates**
    - **Validates: Requirements 3.4**

  - [ ]* 5.6 Write property test for score consistency within tolerance
    - **Property 9: Score Consistency Within Tolerance**
    - **Validates: Requirements 3.5**

- [x] 6. Shortlist Engine
  - [x] 6.1 Implement ShortlistModule with ranking and reasoning
    - Implement `POST /jobs/{job_id}/shortlist` accepting `{ size: number, filters?: object }`: rank candidates by FitScore descending; apply filters (min experience, required skill); call LLM to generate per-candidate reasoning string; persist ShortlistEntry records with rank and reasoning
    - Implement `GET /jobs/{job_id}/shortlist` to retrieve current shortlist
    - Enforce size between 1 and 50; return at most N entries
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.2 Implement shortlist decision persistence
    - Implement `PATCH /jobs/{job_id}/shortlist/{candidate_id}` accepting `{ decision: "accepted" | "rejected" | "deferred" }`; persist decision and decided_at timestamp
    - _Requirements: 4.5_

  - [ ]* 6.3 Write property test for shortlist ordered by fit score descending with reasoning
    - **Property 10: Shortlist Is Ordered by Fit Score Descending with Reasoning**
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 6.4 Write property test for shortlist size respects requested maximum
    - **Property 11: Shortlist Size Respects Requested Maximum**
    - **Validates: Requirements 4.2**

  - [ ]* 6.5 Write property test for filtered shortlist satisfies all filter constraints
    - **Property 12: Filtered Shortlist Satisfies All Filter Constraints**
    - **Validates: Requirements 4.4**

  - [ ]* 6.6 Write property test for shortlist decision persistence round trip
    - **Property 13: Shortlist Decision Persistence Round Trip**
    - **Validates: Requirements 4.5**

- [ ] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Bias Detection Service
  - [ ] 8.1 Implement BiasDetectionModule as post-processing step
    - Implement `GET /jobs/{job_id}/candidates/{candidate_id}/bias`: analyze FitScore breakdown for demographic proxy signals (institution names, graduation years, name patterns); return array of BiasFlag records with signal_type, description, affected_criterion, severity
    - Implement `GET /jobs/{job_id}/bias-report`: aggregate BiasFlags across all candidates; return score distribution and flagged signals summary
    - Ensure bias detection never uses name, gender, age, nationality, or ethnicity as scoring inputs
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 8.2 Write property test for bias detector flags known proxy signals
    - **Property 14: Bias Detector Flags Known Proxy Signals**
    - **Validates: Requirements 5.1**

  - [ ]* 8.3 Write property test for protected attribute invariance in scoring
    - **Property 15: Protected Attribute Invariance in Scoring**
    - **Validates: Requirements 5.4**

- [ ] 9. Conversational Assistant Service
  - [ ] 9.1 Implement AssistantModule with LangChain.js session management
    - Implement `POST /assistant/sessions` to create a new AssistantSession (stored in Redis for active state, persisted to PostgreSQL)
    - Implement `POST /assistant/sessions/{id}/query`: use LangChain.js with session-scoped context window; interpret natural language query; retrieve matching candidates via pgvector similarity search; return ranked results ordered by FitScore descending with interpretation string; complete within 5 seconds
    - Implement `GET /assistant/sessions/{id}` to retrieve full session turn history
    - Scope all results to the recruiter's authorized job openings (HTTP 403 for unauthorized access)
    - On uninterpretable query or zero results, return `{ results: [], clarification: "...", suggestions: [...] }` with HTTP 200
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 9.2 Write property test for query results ordered by fit score
    - **Property 16: Query Results Ordered by Fit Score**
    - **Validates: Requirements 6.1**

  - [ ]* 9.3 Write property test for query response includes interpretation
    - **Property 17: Query Response Includes Interpretation**
    - **Validates: Requirements 6.2**

  - [ ]* 9.4 Write property test for session history preserved across turns
    - **Property 18: Session History Preserved Across Turns**
    - **Validates: Requirements 6.3**

  - [ ]* 9.5 Write property test for query results scoped to authorized jobs
    - **Property 19: Query Results Scoped to Authorized Jobs**
    - **Validates: Requirements 6.5**

- [ ] 10. Interview Kit Service
  - [ ] 10.1 Implement InterviewKitModule with generation and CRUD
    - Implement `POST /jobs/{job_id}/candidates/{candidate_id}/interview-kit`: call LLM with candidate profile and screening criteria to generate 5–15 questions; ensure at least one behavioral, one technical, and one gap question; each question must have a rubric with non-empty strong/adequate/weak fields; persist InterviewKit
    - Implement `GET` and `PUT` endpoints for retrieving and updating the kit (add/remove/edit questions)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 10.2 Implement Interview Kit PDF export
    - Implement `GET /jobs/{job_id}/candidates/{candidate_id}/interview-kit/export`: use Puppeteer or pdfmake to render questions, rubrics, and candidate summary into a PDF; return as `application/pdf` response
    - _Requirements: 7.5_

  - [ ]* 10.3 Write property test for interview kit structure completeness
    - **Property 20: Interview Kit Structure Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ]* 10.4 Write property test for interview kit mutability
    - **Property 21: Interview Kit Mutability**
    - **Validates: Requirements 7.4**

- [ ] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Candidate Profile Serialization and Schema Validation
  - [ ] 12.1 Implement CandidateProfile serialization, deserialization, and schema validation
    - Implement `serializeCandidateProfile` and `deserializeCandidateProfile` functions using the v1 JSON schema; expose schema definition via `GET /schema/candidate-profile`
    - On deserialization failure, return HTTP 400 with `{ error: "schema_validation_failed", fields: [...] }`
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [ ]* 12.2 Write property test for candidate profile serialization round trip
    - **Property 22: Candidate Profile Serialization Round Trip**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 13. Authentication, authorization, and API guards
  - Implement JWT-based auth guard in NestJS; attach recruiter_id to all requests
  - Enforce ownership checks on all job/candidate/shortlist/kit endpoints (HTTP 403 for unauthorized)
  - Wire authorization scope into the Conversational Assistant query layer
  - _Requirements: 6.5_

- [ ] 14. React frontend — recruiter dashboard and chat UI
  - Scaffold React+Vite app with TailwindCSS; set up React Router and API client (axios or fetch wrapper)
  - Implement Job Description upload page (drag-and-drop, status polling, criteria review/edit form)
  - Implement Candidate list page with FitScore display, score breakdown, and bias warning indicators
  - Implement Shortlist page with ranked candidates, reasoning, accept/reject/defer controls, and filter panel
  - Implement Conversational Assistant chat panel with session history and result display
  - Implement Interview Kit view with inline editing and PDF export button
  - _Requirements: 1.3, 3.3, 4.1, 4.5, 5.2, 6.2, 7.4, 7.5_

- [ ] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with `numRuns: 100` minimum and must include the comment `// Feature: ai-hiring-platform, Property N: <property_text>`
- All 22 correctness properties from the design document are covered by property test sub-tasks
- Checkpoints ensure incremental validation at logical boundaries
