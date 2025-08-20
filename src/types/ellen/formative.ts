export interface FormativeToolRequest {
  user_input: string;
  context?: {
    topic_id?: string;
    domain?: string;
    level?: string;
    prior_interactions?: string[];
  };
  retrieval?: {
    snippets?: Array<{
      text: string;
      citation: string;
    }>;
  };
}

export interface FormativeCheckRequest {
  user_response: string;
  expected?: string;
  context?: {
    topic_id?: string;
    domain?: string;
    question?: string;
  };
  check_type?: 'conceptual' | 'procedural' | 'factual' | 'metacognitive';
}

export interface FormativeCheckResponse {
  evidence_tags: string[];
  feedback: {
    feed_up: string;
    feed_back: string;
    feed_forward: string;
  };
  next_action?: {
    tool?: string;
    reason?: string;
  };
  misconceptions?: Array<{
    identified: string;
    correction: string;
  }>;
  meta?: {
    confidence?: number;
    model_tier?: 'S' | 'M' | 'L' | 'F';
  };
}

export interface DiagnosticProbeRequest {
  topic_id: string;
  domain: string;
  level?: 'intro' | 'intermediate' | 'advanced';
  prior_knowledge?: string[];
  exam_prep?: boolean;
}

export interface DiagnosticProbeResponse {
  probes: Array<{
    question: string;
    type: 'conceptual' | 'procedural' | 'boundary_case';
    difficulty: number;
  }>;
  coverage_map: Record<string, boolean>;
  recommended_path?: string[];
}

export interface RevisionSchedulerRequest {
  topics: string[];
  exam_date?: string;
  current_date?: string;
  study_hours_per_day?: number;
  prior_performance?: Record<string, number>;
}

export interface RevisionSchedulerResponse {
  schedule: Array<{
    date: string;
    topics: string[];
    duration_minutes: number;
    type: 'new' | 'review' | 'practice';
  }>;
  spaced_intervals: Record<string, number[]>;
  interleaving_pattern?: string[];
}

export interface WorkedExampleRequest {
  problem: string;
  domain: string;
  show_steps?: number;
  highlight_strategy?: boolean;
}

export interface WorkedExampleResponse {
  problem_statement: string;
  steps: Array<{
    step: string;
    why: string;
    visual?: string;
  }>;
  strategy_highlight?: string;
  common_errors?: string[];
  practice_variations?: string[];
}

export interface ConceptMapperRequest {
  central_concept: string;
  domain?: string;
  depth?: number;
  include_prerequisites?: boolean;
}

export interface ConceptMapperResponse {
  map: {
    nodes: Array<{
      id: string;
      label: string;
      type: 'concept' | 'example' | 'application';
    }>;
    edges: Array<{
      from: string;
      to: string;
      relationship: string;
    }>;
  };
  prerequisites?: string[];
  applications?: string[];
}