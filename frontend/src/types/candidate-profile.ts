export interface ContactInfo {
  email: string;
  phone: string | null;
  location: string | null;
}

export interface WorkExperience {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduation_year: number | null;
}

export interface Skill {
  canonical_name: string;
  raw_aliases: string[];
}

export interface CandidateProfile {
  schema_version: '1';
  id: string;
  job_id: string;
  name: string;
  contact: ContactInfo;
  work_experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  summary: string;
  parse_status: 'success' | 'error';
  error_message: string | null;
  created_at: string;
}
