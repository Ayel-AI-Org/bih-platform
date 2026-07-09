import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "@/lib/platform-data";
import { type UserRole, type Session } from "@/types/models";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchSession = async () => {
      try {
        const currentSession = await getSession();
        if (active) {
          setSession(currentSession);
        }
      } catch (err) {
        console.error("Failed to verify user session:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchSession();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground text-sm font-medium animate-pulse">
            Verifying security privileges...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if unauthenticated
  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Redirect to unauthorized index or profile if role mismatch
  if (!allowedRoles.includes(session.role)) {
    return <Navigate to={session.role === "admin" ? "/admin" : "/profile"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
