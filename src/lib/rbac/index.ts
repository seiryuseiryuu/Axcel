import { createClient } from '@/lib/supabase/server';
import { UserRole, hasPermission, Permission, canAccessAdmin } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';

export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    profileId: string;
    displayName: string;
}

// Get current authenticated user with profile
export async function getAuthUser(): Promise<AuthUser | null> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, display_name')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return null;
    }

    return {
        id: user.id,
        email: user.email!,
        role: profile.role as UserRole,
        profileId: profile.id,
        displayName: profile.display_name,
    };
}

// Require authentication, redirect to login if not authenticated
export async function requireAuth(): Promise<AuthUser> {
    const user = await getAuthUser();

    if (!user) {
        redirect('/login');
    }

    return user;
}

// Require specific role, redirect if not authorized
export async function requireRole(requiredRole: UserRole): Promise<AuthUser> {
    const user = await requireAuth();

    const roleHierarchy: Record<UserRole, number> = {
        student: 1,
        instructor: 2,
        admin: 3,
    };

    if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
        redirect('/unauthorized');
    }

    return user;
}

// Require specific permission
export async function requirePermission(permission: Permission): Promise<AuthUser> {
    const user = await requireAuth();

    if (!hasPermission(user.role, permission)) {
        redirect('/unauthorized');
    }

    return user;
}

// Require admin panel access (admin or instructor)
export async function requireAdminAccess(): Promise<AuthUser> {
    const user = await requireAuth();

    if (!canAccessAdmin(user.role)) {
        redirect('/student/dashboard');
    }

    return user;
}

// Require student panel access
export async function requireStudentAccess(): Promise<AuthUser> {
    const user = await requireAuth();

    if (user.role !== 'student') {
        redirect('/admin');
    }

    return user;
}
