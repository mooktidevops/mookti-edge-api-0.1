export interface SocraticElenchusRequest {
  user_utterance: string;
  context?: {
    topic_id?: string;
    domain?: string;
    subtopic?: string;
    prior_turns?: string[];
    exam_prep?: boolean;
    preferences?: Record<string, any>;
  };
  retrieval?: {
    snippets?: Array<{
      text: string;
      citation: string;
    }>;
    citations?: Array<{
      title: string;
      source: string;
      loc?: string;
    }>;
  };
  emotion_signals?: Array<'frustrated' | 'anxious' | 'confident' | 'discouraged' | 'curious'>;
  policy: {
    answer_first_if_specific: boolean;
    max_questions: number;
    gentle_challenge: boolean;
    grounding_required: boolean;
  };
}

export interface SocraticElenchusResponse {
  answer?: string;
  focus_question: string;
  extension_question?: string;
  assumption_probe?: string;
  hint_cascade?: {
    nudge?: string;
    structure?: string;
    partial_step?: string;
  };
  feedback?: {
    feed_up?: string;
    feed_back?: string;
    feed_forward?: string;
  };
  evidence_tags?: string[];
  citations?: Array<{
    title: string;
    source: string;
    loc?: string;
    is_user_source?: boolean;
  }>;
  next_action?: {
    tool?: string;
    reason?: string;
  };
  empathy?: string;
  meta?: {
    reasoning_trace?: string;
    model_tier?: 'S' | 'M' | 'L' | 'F';
  };
}