import { AuditLog, UUID } from "@/types";

export interface LogAuditEventParams {
  school_id: UUID;
  actor_user_id?: UUID | null;
  action: string;
  entity_type: string;
  entity_id: UUID;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export class AuditLogger {
  private static inMemoryStore: AuditLog[] = [];

  /**
   * Records an immutable audit log entry.
   * Master Spec Section 7.10: Append-only, cannot be deleted or modified by users.
   */
  public static async log(params: LogAuditEventParams): Promise<AuditLog> {
    const entry: AuditLog = {
      id: crypto.randomUUID(),
      school_id: params.school_id,
      actor_user_id: params.actor_user_id ?? null,
      action: params.action.toUpperCase(),
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      before_data: params.before_data ? JSON.parse(JSON.stringify(params.before_data)) : null,
      after_data: params.after_data ? JSON.parse(JSON.stringify(params.after_data)) : null,
      ip_address: params.ip_address ?? null,
      user_agent: params.user_agent ?? null,
      created_at: new Date().toISOString(),
    };

    // Store in memory (or insert into PostgreSQL audit_logs table)
    this.inMemoryStore.push(entry);
    return entry;
  }

  public static async getLogsForEntity(
    school_id: UUID,
    entity_type: string,
    entity_id: UUID
  ): Promise<AuditLog[]> {
    return this.inMemoryStore.filter(
      (log) =>
        log.school_id === school_id &&
        log.entity_type === entity_type &&
        log.entity_id === entity_id
    );
  }

  public static async getLogsForSchool(school_id: UUID): Promise<AuditLog[]> {
    return this.inMemoryStore.filter((log) => log.school_id === school_id);
  }

  public static clearMemoryForTesting(): void {
    this.inMemoryStore = [];
  }
}
