import { PermissionCode, RoleCode, UUID } from "@/types";

export interface UserContext {
  userId: UUID;
  schoolId: UUID;
  roles: RoleCode[];
  permissions: PermissionCode[];
}

export const ROLE_DEFAULT_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  SYSTEM_ADMIN: [
    "meal_plan.view",
    "meal_plan.create",
    "meal_plan.update",
    "meal_plan.confirm",
    "recipe.view",
    "recipe.manage",
    "purchase.view",
    "purchase.create",
    "purchase.submit",
    "receiving.create",
    "receiving.inspect",
    "receiving.confirm",
    "inventory.view",
    "inventory.issue",
    "inventory.adjust",
    "finance.view",
    "finance.create",
    "finance.post",
    "approval.view",
    "approval.act",
    "report.view",
    "report.export",
    "user.manage",
    "settings.manage",
  ],
  SCHOOL_ADMIN: [
    "meal_plan.view",
    "recipe.view",
    "purchase.view",
    "receiving.create",
    "receiving.inspect",
    "inventory.view",
    "finance.view",
    "approval.view",
    "report.view",
    "report.export",
    "user.manage",
    "settings.manage",
  ],
  PLANNER: [
    "meal_plan.view",
    "meal_plan.create",
    "meal_plan.update",
    "meal_plan.confirm",
    "recipe.view",
    "recipe.manage",
    "purchase.view",
    "purchase.create",
    "report.view",
  ],
  DUTY_TEACHER: [
    "meal_plan.view",
    "recipe.view",
    "purchase.view",
    "receiving.create",
    "receiving.inspect",
    "receiving.confirm",
    "inventory.view",
    "inventory.issue",
  ],
  FINANCE_OFFICER: [
    "finance.view",
    "finance.create",
    "finance.post",
    "purchase.view",
    "report.view",
    "report.export",
  ],
  EXECUTIVE: [
    "meal_plan.view",
    "recipe.view",
    "purchase.view",
    "inventory.view",
    "finance.view",
    "approval.view",
    "approval.act",
    "report.view",
    "report.export",
  ],
};

export class AccessControl {
  /**
   * Verifies if the context has the requested permission.
   * Spec 4.2: Evaluates granular permissions, never purely relies on raw role strings.
   */
  public static hasPermission(
    context: UserContext | null,
    permission: PermissionCode
  ): boolean {
    if (!context) return false;
    return context.permissions.includes(permission);
  }

  /**
   * Checks multi-tenant data isolation.
   * Spec 8.1: Prevents cross-school access.
   */
  public static isSchoolAuthorized(
    context: UserContext | null,
    targetSchoolId: UUID
  ): boolean {
    if (!context) return false;
    return context.schoolId === targetSchoolId;
  }

  /**
   * Checks Separation of Duties (Spec 4.3):
   * Creator cannot approve their own document unless explicit override exists.
   */
  public static canApproveDocument(
    context: UserContext | null,
    documentCreatorId: UUID
  ): { allowed: boolean; reason?: string } {
    if (!context) {
      return { allowed: false, reason: "Unauthorized: No user session" };
    }

    if (!this.hasPermission(context, "approval.act")) {
      return { allowed: false, reason: "Forbidden: Missing approval.act permission" };
    }

    if (context.userId === documentCreatorId) {
      return {
        allowed: false,
        reason: "Separation of Duties: Creator cannot approve their own submission (Self-approval prohibition)",
      };
    }

    return { allowed: true };
  }
}
