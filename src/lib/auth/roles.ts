// User roles in the system
export type UserRole = 'admin' | 'instructor' | 'student';

// Permission definitions for each role
export const ROLE_PERMISSIONS = {
    admin: {
        // Full access
        canManageInstructors: true,
        canManageCourses: true,
        canManageAllStudents: true,
        canUploadVideos: true,
        canManageTranscripts: true,
        canViewAuditLogs: true,
        canManageAIProviders: true,
        canAccessAdminPanel: true,
        canAccessStudentPanel: false,
    },
    instructor: {
        // Course-scoped access
        canManageInstructors: false,
        canManageCourses: true, // Own courses only
        canManageAllStudents: false,
        canUploadVideos: false,
        canManageTranscripts: false, // Read only for own courses
        canViewAuditLogs: false, // Own logs only
        canManageAIProviders: false,
        canAccessAdminPanel: true,
        canAccessStudentPanel: false,
    },
    student: {
        // Personal access only
        canManageInstructors: false,
        canManageCourses: false,
        canManageAllStudents: false,
        canUploadVideos: false,
        canManageTranscripts: false,
        canViewAuditLogs: false,
        canManageAIProviders: false,
        canAccessAdminPanel: false,
        canAccessStudentPanel: true,
    },
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS.admin;

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

// Check if role can access admin panel
export function canAccessAdmin(role: UserRole): boolean {
    return role === 'admin' || role === 'instructor';
}

// Check if role is admin
export function isAdmin(role: UserRole): boolean {
    return role === 'admin';
}

// Check if role is instructor or higher
export function isInstructorOrAbove(role: UserRole): boolean {
    return role === 'admin' || role === 'instructor';
}

// Role hierarchy for comparison
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    student: 1,
    instructor: 2,
    admin: 3,
};

// Compare roles
export function isRoleHigherOrEqual(role: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
}
