import { BUDGET } from "../config";

const PRICE_USD_PER_M = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
} as const;

type ModelId = keyof typeof PRICE_USD_PER_M;

export class BudgetExceededError extends Error {
  constructor(spent: number, limit: number) {
    super(`Budget exceeded: $${spent.toFixed(4)} > $${limit.toFixed(2)}`);
  }
}

export class CostTracker {
  private _spent = 0;
  private _byModel = new Map<string, { inputTokens: number; outputTokens: number; usd: number }>();
  readonly limit: number;

  constructor(limit: number = BUDGET.usd) {
    this.limit = limit;
  }

  record(model: string, inputTokens: number, outputTokens: number): number {
    const price = PRICE_USD_PER_M[model as ModelId];
    const usd = price
      ? (inputTokens * price.input + outputTokens * price.output) / 1_000_000
      : 0;

    this._spent += usd;
    const prev = this._byModel.get(model) ?? { inputTokens: 0, outputTokens: 0, usd: 0 };
    this._byModel.set(model, {
      inputTokens: prev.inputTokens + inputTokens,
      outputTokens: prev.outputTokens + outputTokens,
      usd: prev.usd + usd,
    });

    if (this._spent > this.limit) {
      throw new BudgetExceededError(this._spent, this.limit);
    }
    return usd;
  }

  get spent(): number {
    return this._spent;
  }

  summary(): Record<string, { inputTokens: number; outputTokens: number; usd: number }> {
    return Object.fromEntries(this._byModel);
  }
}
