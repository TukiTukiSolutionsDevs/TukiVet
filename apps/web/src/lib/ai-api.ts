import { api } from "./api";

export type SoapSuggestionRequest = {
  chief_complaint?: string;
  species?: string;
  breed?: string | null;
  age_years?: number | null;
  weight_kg?: string | null;
  vitals?: Record<string, unknown>;
  problems?: string[];
  existing_soap?: Record<string, unknown>;
};

export type SoapSuggestionResponse = {
  subjective: { summary?: string; history?: string };
  objective: { physical_exam?: string };
  assessment: string[];
  plan: { treatment?: string; follow_up?: string; owner_instructions?: string };
  diagnostic_suggestions: string[];
  red_flags: string[];
  mock: boolean;
};

export const aiApi = {
  suggestSoap: (payload: SoapSuggestionRequest) =>
    api.post<SoapSuggestionResponse>("/api/v1/ai/suggest-soap", payload),
};
