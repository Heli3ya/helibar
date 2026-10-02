import React from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { Forbidden403 } from './Forbidden403';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallbackUrl?: string;
  redirectToLogin?: () => void;
  onRedirectToDashboard?: () => void;
}

/**
 * RouteGuard enforces:
 * 1. Authentication check via JWT token stored in AuthContext.
 * 2. URL-less isolated dashboard architecture:
 *    SUPPORT users are always scoped to the generic /dashboard endpoint (never /dashboard/:id).
 *    The backend independently determines their tenant data from the Authorization: Bearer <token> header.
 * 3. Role-Based Access Control:
 *    Redirects or blocks SUPPORT users attempting to access ADMIN routes with a 403 Forbidden view.
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  allowedRoles,
  redirectToLogin,
  onRedirectToDashboard,
}) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated || !currentUser) {
    if (redirectToLogin) {
      redirectToLogin();
      return null;
    }
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        در حال اعتبارسنجی نشست کاربری...
      </div>
    );
  }

  // If specific roles are required (e.g. ['ADMIN'] for /admin/* routes)
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <Forbidden403
        onBackToDashboard={onRedirectToDashboard}
        message={`دسترسی غیرمجاز: نقش کاربری شما (${currentUser.role}) مجوز مشاهده این ماژول را ندارد.`}
      />
    );
  }

  return <>{children}</>;
};

/**
 * AdminRoute Guard:
 * Strictly blocks non-ADMIN users from accessing administrative tools.
 */
export const AdminRoute: React.FC<{
  children: React.ReactNode;
  onRedirectToDashboard: () => void;
}> = ({ children, onRedirectToDashboard }) => {
  const { currentUser } = useAuth();
  if (currentUser && (currentUser.role !== 'ADMIN' || currentUser.username !== 'heliya')) {
    return (
      <Forbidden403
        onBackToDashboard={onRedirectToDashboard}
        message="دسترسی به بخش مدیریت منحصراً برای کاربر heliya مجاز است."
      />
    );
  }
  return (
    <RouteGuard allowedRoles={['ADMIN']} onRedirectToDashboard={onRedirectToDashboard}>
      {children}
    </RouteGuard>
  );
};

/**
 * IsolatedDashboardRoute Guard:
 * Serves the single URL-less /dashboard route.
 * Prevents URL parameter tampering (such as /dashboard/userX vs /dashboard/userY).
 */
export const IsolatedDashboardRoute: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <RouteGuard allowedRoles={['ADMIN', 'SUPPORT']}>
      {children}
    </RouteGuard>
  );
};
