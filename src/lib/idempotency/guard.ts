import { IdempotencyRecord, UUID } from "@/types";

export interface IdempotencyCheckResult {
  isNew: boolean;
  record?: IdempotencyRecord;
}

export class IdempotencyGuard {
  private static store: Map<string, IdempotencyRecord> = new Map();

  private static makeKey(school_id: UUID, key: string, operation: string): string {
    return `${school_id}:${operation}:${key}`;
  }

  /**
   * Checks whether this operation with idempotencyKey has already been processed.
   * If not, registers it and returns isNew: true.
   * If already processed, returns isNew: false along with the existing record to prevent duplicate processing.
   */
  public static async checkAndLock(
    school_id: UUID,
    idempotency_key: string,
    operation: string,
    result_reference?: string
  ): Promise<IdempotencyCheckResult> {
    const compositeKey = this.makeKey(school_id, idempotency_key, operation);
    const existing = this.store.get(compositeKey);

    if (existing) {
      return {
        isNew: false,
        record: existing,
      };
    }

    const record: IdempotencyRecord = {
      id: crypto.randomUUID(),
      school_id,
      idempotency_key,
      operation,
      result_reference,
      created_at: new Date().toISOString(),
    };

    this.store.set(compositeKey, record);

    return {
      isNew: true,
      record,
    };
  }

  public static clearMemoryForTesting(): void {
    this.store.clear();
  }
}
