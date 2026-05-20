/**
 * STRIDE threat-model prompt builder
 *
 * Adapted from STRIDE-GPT threat_model.py::create_threat_model_prompt()
 * Source: https://github.com/mrwadams/stride-gpt
 * MIT License Copyright (c) Matthew Adams
 * See LICENSE-third-party.md for full attribution.
 *
 * Pure logic / literal text — no Streamlit dependency.
 *
 * Differences from upstream:
 *   - TypeScript port (Python f-string → template literal)
 *   - Returns `{ system, user }` pair instead of single concatenated prompt,
 *     to align with Ollama/Claude Code chat API conventions
 *   - JSON output schema aligned to src/ir/types.ts ThreatModel shape
 */

import type { ThreatModelPromptOpts } from './types.js';
import { owaspLlmStridePromptSection } from './owasp-llm.js';
import { owaspAsiStridePromptSection } from './owasp-asi.js';

export interface ThreatModelPromptOutput {
  system: string;
  user: string;
}

export function createThreatModelPrompt(opts: ThreatModelPromptOpts): ThreatModelPromptOutput {
  const isGenAi = opts.appType === 'Generative AI application';
  const isAgentic = opts.appType === 'Agentic AI application';
  const includeLlmRisks = isGenAi || isAgentic;

  const system = `Act as a cyber security expert with more than 20 years experience of using the STRIDE threat modelling methodology to produce comprehensive threat models for a wide range of applications. Your task is to analyze the provided code summary, README content, and application description to produce a list of specific threats for the application.

Pay special attention to the README content as it often provides valuable context about the project's purpose, architecture, and potential security considerations.

Output strict JSON only. No prose before or after the JSON object.`;

  let userPrompt = '';

  // STRIDE guidance - different for each app type
  if (isAgentic) {
    userPrompt += `For this AGENTIC AI APPLICATION, you must consider traditional STRIDE threats, LLM-specific threats from the OWASP Top 10 for LLM Applications (LLM01-LLM10), AND agentic-specific threats from the OWASP Top 10 for Agentic Applications (ASI01-ASI10). For each STRIDE category, identify threats covering AI agent risks including prompt injection, tool misuse, memory poisoning, autonomous action risks, and LLM vulnerabilities.

`;
  } else if (isGenAi) {
    userPrompt += `For this GENERATIVE AI APPLICATION, you must consider both traditional STRIDE threats AND LLM-specific threats from the OWASP Top 10 for LLM Applications 2025 (LLM01-LLM10). For each STRIDE category, identify threats specific to LLM-powered applications including prompt injection, sensitive data disclosure, and improper output handling.

`;
  } else {
    userPrompt += `For each of the STRIDE categories (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege), list multiple (3 or 4) credible threats if applicable. `;
  }

  userPrompt += `Each threat scenario should provide a credible scenario in which the threat could occur in the context of the application. It is very important that your responses are tailored to reflect the details you are given.

`;

  // JSON format instructions (aligned to src/ir/types.ts ThreatModel)
  if (isAgentic) {
    userPrompt += `When providing the threat model, use a JSON formatted response with the keys "threat_model" and "improvement_suggestions". Under "threat_model", include an array of objects with the keys "Threat Type", "Scenario", "Potential Impact", "OWASP_LLM" (the applicable LLM risk code, e.g., "LLM01", "LLM02", etc., or null), and "OWASP_ASI" (the applicable Agentic Security Issue code, e.g., "ASI01", "ASI02", etc., or null). A threat may have both codes if it applies to both categories.

`;
  } else if (isGenAi) {
    userPrompt += `When providing the threat model, use a JSON formatted response with the keys "threat_model" and "improvement_suggestions". Under "threat_model", include an array of objects with the keys "Threat Type", "Scenario", "Potential Impact", and "OWASP_LLM" (the applicable OWASP LLM risk code, e.g., "LLM01", "LLM02", etc., or null if not applicable).

`;
  } else {
    userPrompt += `When providing the threat model, use a JSON formatted response with the keys "threat_model" and "improvement_suggestions". Under "threat_model", include an array of objects with the keys "Threat Type", "Scenario", and "Potential Impact".

`;
  }

  userPrompt += `Under "improvement_suggestions", include an array of strings that suggest what additional information or details the user could provide to make the threat model more comprehensive and accurate in the next iteration. Focus on identifying gaps in the provided application description that, if filled, would enable a more detailed and precise threat analysis.

Do not provide general security recommendations - focus only on what additional information would help create a better threat model.

`;

  // Application details
  userPrompt += `APPLICATION TYPE: ${opts.appType}
AUTHENTICATION METHODS: ${opts.authentication}
INTERNET FACING: ${opts.internetFacing}
SENSITIVE DATA: ${opts.sensitiveData}
`;

  // Add LLM threat categories if applicable (GenAI + Agentic)
  if (includeLlmRisks) {
    userPrompt += owaspLlmStridePromptSection();
  }

  // Add agentic threat categories if applicable
  if (isAgentic) {
    userPrompt += owaspAsiStridePromptSection();
  }

  userPrompt += `
CODE SUMMARY, README CONTENT, AND APPLICATION DESCRIPTION:
${opts.appInput}

`;

  // Example JSON format
  if (isAgentic) {
    userPrompt += `Example of expected JSON response format for Agentic AI applications:

{
  "threat_model": [
    {
      "Threat Type": "Spoofing",
      "Scenario": "An attacker injects malicious instructions into a document processed by the agent, causing it to impersonate a legitimate service when responding to users.",
      "Potential Impact": "Users may trust fraudulent communications, leading to credential theft or financial loss.",
      "OWASP_LLM": "LLM01",
      "OWASP_ASI": "ASI01"
    }
  ],
  "improvement_suggestions": [
    "Provide details about how agent memory/state is persisted and protected."
  ]
}
`;
  } else if (isGenAi) {
    userPrompt += `Example of expected JSON response format for Generative AI applications:

{
  "threat_model": [
    {
      "Threat Type": "Tampering",
      "Scenario": "An attacker injects malicious instructions through user-uploaded documents that are processed by the RAG system, causing the LLM to provide misleading financial advice.",
      "Potential Impact": "Users make poor decisions based on manipulated LLM outputs, leading to financial losses.",
      "OWASP_LLM": "LLM01"
    }
  ],
  "improvement_suggestions": [
    "Describe how user inputs are validated before being sent to the LLM."
  ]
}
`;
  } else {
    userPrompt += `Example of expected JSON response format:

{
  "threat_model": [
    {
      "Threat Type": "Spoofing",
      "Scenario": "Example Scenario 1",
      "Potential Impact": "Example Potential Impact 1"
    }
  ],
  "improvement_suggestions": [
    "Please provide more details about the authentication flow between components to better analyze potential authentication bypass scenarios."
  ]
}
`;
  }

  return { system, user: userPrompt };
}
