/**
 * Description router eval harness scaffold.
 *
 * SPACE-03 fills the query fixtures and implements the router eval loop.
 * This module is a placeholder so the module boundary is established and
 * future work can import from it without restructuring.
 */

export interface EvalQuery {
  input: string;
  expectedSkill: string;
}

export interface EvalResult {
  query: EvalQuery;
  matched: string | null;
  correct: boolean;
}

/** Run the router eval against a set of queries. Not yet implemented. */
export async function runEval(_queries: EvalQuery[]): Promise<EvalResult[]> {
  throw new Error('runEval is not yet implemented — SPACE-03 will fill this.');
}
