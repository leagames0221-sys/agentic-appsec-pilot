/**
 * Threat-model prompt option types
 *
 * Adapted from STRIDE-GPT (https://github.com/mrwadams/stride-gpt)
 * MIT License Copyright (c) Matthew Adams
 * See LICENSE-third-party.md for full attribution.
 */

export type AppType =
  | 'Traditional application'
  | 'Generative AI application'
  | 'Agentic AI application';

export interface ThreatModelPromptOpts {
  /** Application type — affects whether LLM/ASI sections are included */
  appType: AppType;
  /** Authentication methods (free text from user, e.g. "OAuth + SAML") */
  authentication: string;
  /** Whether the app is internet-facing (free text or yes/no) */
  internetFacing: string;
  /** Sensitive data handled (free text, e.g. "PII, payment cards") */
  sensitiveData: string;
  /** Code summary + README + application description (free text from repo scan) */
  appInput: string;
}
