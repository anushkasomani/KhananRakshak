/**
 * Retrieval over the historical hazard corpus.
 *
 * Scoring here is keyword overlap plus hazard-type agreement — a stand-in
 * for embedding similarity, deliberately kept behind one function (`retrieve`) so a
 * real vector store (FAISS, Qdrant, Chroma, pgvector, Pinecone) can replace the body
 * without the page or the risk engine changing.
 *
 * Only historical documents are indexed. Live 30-second sensor readings are never
 * written here — they are current state, not retrievable knowledge.
 */

import { HISTORICAL_HAZARDS, HazardType, HistoricalHazard } from './historicalHazards';
import { ZoneRisk, hazardTypeFor } from './riskEngine';

export interface RetrievedDocument {
  document: HistoricalHazard;
  /** 0–100. Presented as a similarity score, not a probability of recurrence. */
  similarity: number;
  /** Why this document came back, shown so retrieval is auditable rather than magic. */
  matchedOn: string[];
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
  'what', 'why', 'how', 'which', 'when', 'should', 'have', 'has', 'been', 'do', 'does', 'this',
  'that', 'there', 'here', 'be', 'it', 'its', 'with', 'from', 'about', 'any', 'currently', 'show',
]);

const tokenize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word));

interface RetrieveOptions {
  /** Free text — a user question, or a description assembled from the risk state. */
  query?: string;
  /** Bias towards documents recording the same hazard. */
  hazardType?: HazardType;
  limit?: number;
  /** Documents below this similarity are dropped rather than padded in. */
  minSimilarity?: number;
}

/**
 * Returns the historical documents most like the supplied situation, best first.
 * Replace the body with a vector-store query to move off the mock corpus.
 */
export function retrieve(options: RetrieveOptions): RetrievedDocument[] {
  const { query = '', hazardType, limit = 3, minSimilarity = 25 } = options;
  const queryTerms = new Set(tokenize(query));

  const scored = HISTORICAL_HAZARDS.map((document): RetrievedDocument => {
    const matchedOn: string[] = [];
    let score = 0;

    // Hazard agreement is the strongest signal available: these reports are indexed
    // by what went wrong, and a past flood is what a current flood should retrieve.
    if (hazardType && document.hazardType === hazardType) {
      score += 58;
      matchedOn.push(`hazard type ${hazardType}`);
    }

    const documentTerms = new Set([
      ...document.keywords.flatMap((keyword) => tokenize(keyword)),
      ...tokenize(document.title),
      ...tokenize(document.description),
    ]);
    const overlap = [...queryTerms].filter((term) => documentTerms.has(term));
    if (overlap.length) {
      // Diminishing returns, so one long question cannot outrank a real hazard match.
      score += Math.min(34, overlap.length * 9);
      matchedOn.push(`terms: ${overlap.slice(0, 4).join(', ')}`);
    }

    // A high-severity record is more worth surfacing when it is otherwise relevant.
    if (score > 0 && document.severity === 'HIGH') {
      score += 6;
      matchedOn.push('high-severity record');
    }

    return { document, similarity: Math.min(97, Math.round(score)), matchedOn };
  });

  return scored
    .filter((row) => row.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity || a.document.date.localeCompare(b.document.date))
    .slice(0, limit);
}

/** Retrieval driven by the risk engine's reading of a district, for the AI analysis panel. */
export function retrieveForZone(risk: ZoneRisk, limit = 3): RetrievedDocument[] {
  const hazardType = hazardTypeFor(risk);
  const query = [
    risk.primaryHazard,
    ...risk.criticalSensors.map((sensor) => sensor.label),
  ].join(' ');
  return retrieve({ query, hazardType, limit });
}

export interface EvidenceSummary {
  retrieved: number;
  highSeverity: number;
  inspections: number;
}

export const summarizeEvidence = (documents: RetrievedDocument[]): EvidenceSummary => ({
  retrieved: documents.length,
  highSeverity: documents.filter((row) => row.document.severity === 'HIGH').length,
  inspections: documents.filter((row) => row.document.source.toLowerCase().includes('inspection')).length,
});
