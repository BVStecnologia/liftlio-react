import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Admin email that has access to restricted pages
const ADMIN_EMAIL = 'valdair3d@gmail.com';

interface AdminGateProps {
  children: React.ReactNode;
}

/**
 * Restricts access to admin-only pages.
 * Only users with the admin email can access wrapped content.
 * Others are redirected to dashboard.
 */
const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const { user } = useAuth();

  // If not logged in or not admin, redirect to dashboard
  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminGate;

// Export helper function to check admin status
export const isAdminUser = (email?: string | null): boolean => {
  return email === ADMIN_EMAIL;
};
