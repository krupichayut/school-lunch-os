import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { AccessControl } from "../lib/auth/rbac";
import { DataStore } from "../lib/db/repository";
import { AuditLogger } from "../lib/audit/logger";
import { IdempotencyGuard } from "../lib/idempotency/guard";
import { UUID } from "../types";

describe("Package 1: Foundation, Security & Multi-Tenant Tests", () => {
  const store = new DataStore();
  const schoolA: UUID = "11111111-1111-1111-1111-111111111111";
  const schoolB: UUID = "99999999-9999-9999-9999-999999999999";

  const teacherSomsri: UUID = "22222222-2222-2222-2222-222222222222";
  const execSomkiat: UUID = "33333333-3333-3333-3333-333333333333";
  const financeNapha: UUID = "44444444-4444-4444-4444-444444444444";

  test("T-001: Unauthenticated access without session is rejected", () => {
    const context = null;
    const canView = AccessControl.hasPermission(context, "meal_plan.view");
    assert.equal(canView, false, "Unauthenticated user must not have any permissions");

    const isAuth = AccessControl.isSchoolAuthorized(context, schoolA);
    assert.equal(isAuth, false, "Unauthenticated user must not be authorized to any school");
  });

  test("T-002: User without specific permission is rejected (Server-side RBAC)", () => {
    const teacherContext = store.getUserContext(teacherSomsri, schoolA);
    assert.ok(teacherContext, "Teacher context should exist");

    // Teacher HAS receiving and inspection permissions
    assert.equal(
      AccessControl.hasPermission(teacherContext, "receiving.inspect"),
      true,
      "Duty teacher should have receiving.inspect"
    );
    assert.equal(
      AccessControl.hasPermission(teacherContext, "receiving.confirm"),
      true,
      "Duty teacher should have receiving.confirm"
    );

    // Teacher DOES NOT have financial posting or approval permissions
    assert.equal(
      AccessControl.hasPermission(teacherContext, "finance.post"),
      false,
      "Duty teacher must NOT have finance.post permission"
    );
    assert.equal(
      AccessControl.hasPermission(teacherContext, "approval.act"),
      false,
      "Duty teacher must NOT have approval.act permission"
    );
  });

  test("T-003: Multi-tenant cross-school data access is blocked", () => {
    const teacherContext = store.getUserContext(teacherSomsri, schoolA);
    assert.ok(teacherContext);

    // Context is for School A, check against School B
    const accessSchoolA = AccessControl.isSchoolAuthorized(teacherContext, schoolA);
    const accessSchoolB = AccessControl.isSchoolAuthorized(teacherContext, schoolB);

    assert.equal(accessSchoolA, true, "User must have access to their assigned school");
    assert.equal(accessSchoolB, false, "User must NEVER have access to another school (Cross-school isolation)");
  });

  test("Spec 4.3: Separation of Duties - Creator cannot approve own document", () => {
    const execContext = store.getUserContext(execSomkiat, schoolA);
    assert.ok(execContext);

    // Executive CAN approve a document created by someone else (e.g. Finance or Teacher)
    const approveTeacherDoc = AccessControl.canApproveDocument(execContext, teacherSomsri);
    assert.equal(approveTeacherDoc.allowed, true);

    // Executive CANNOT approve a document that the Executive created themselves
    const approveOwnDoc = AccessControl.canApproveDocument(execContext, execSomkiat);
    assert.equal(approveOwnDoc.allowed, false, "Self-approval must be forbidden by default");
    assert.match(approveOwnDoc.reason || "", /Self-approval prohibition/);
  });

  test("Spec 7.10: Audit Logger creates append-only records with before/after state", async () => {
    AuditLogger.clearMemoryForTesting();

    const logged = await AuditLogger.log({
      school_id: schoolA,
      actor_user_id: teacherSomsri,
      action: "INSPECT_INGREDIENT",
      entity_type: "receiving_item",
      entity_id: "55555555-5555-5555-5555-555555555555",
      before_data: { inspection_status: "PENDING" },
      after_data: { inspection_status: "ACCEPTED", accepted_quantity: 8.0 },
    });

    assert.ok(logged.id);
    assert.equal(logged.school_id, schoolA);
    assert.equal(logged.action, "INSPECT_INGREDIENT");
    assert.equal(logged.before_data?.inspection_status, "PENDING");
    assert.equal(logged.after_data?.inspection_status, "ACCEPTED");

    const schoolLogs = await AuditLogger.getLogsForSchool(schoolA);
    assert.equal(schoolLogs.length, 1);
  });

  test("Spec 7.11: Idempotency Guard rejects duplicate submission", async () => {
    IdempotencyGuard.clearMemoryForTesting();
    const idempotencyKey = "req-morning-inspect-2026-11-05";
    const operation = "CONFIRM_RECEIVING";

    // 1st attempt: should be accepted
    const firstAttempt = await IdempotencyGuard.checkAndLock(
      schoolA,
      idempotencyKey,
      operation,
      "RCV-2569-000001"
    );
    assert.equal(firstAttempt.isNew, true, "First submission must be treated as new");

    // 2nd attempt (same key & operation): must be rejected as duplicate
    const secondAttempt = await IdempotencyGuard.checkAndLock(
      schoolA,
      idempotencyKey,
      operation,
      "RCV-2569-000001"
    );
    assert.equal(secondAttempt.isNew, false, "Duplicate submission must be detected");
    assert.equal(secondAttempt.record?.result_reference, "RCV-2569-000001");
  });
});
