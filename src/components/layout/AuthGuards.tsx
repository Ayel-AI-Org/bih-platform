import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/database/client";
import type { UserRole } from "@/database/types";

export interface UserAuthStatus {
  loading: boolean;
  user: any;
  role: UserRole | null;
  approvalStatus: "pending" | "approved" | "rejected" | null;
}

export const fetchUserAuthStatus = async (): Promise<Omit<UserAuthStatus, "loading">> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, role: null, approvalStatus: null };
  }

  // Fetch role from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { user, role: null, approvalStatus: null };
  }

  const role = profile.role as UserRole;
  if (role === "admin") {
    return { user, role, approvalStatus: null };
  }

  // Check approval_status from corresponding table
  const roleTableMap = {
    volunteer: "volunteer_profiles",
    ngo: "ngo_profiles",
    donor: "donor_profiles",
  };

  const tableName = roleTableMap[role as "volunteer" | "ngo" | "donor"];
  if (!tableName) {
    return { user, role, approvalStatus: null };
  }

  const { data: roleProfile, error: roleError } = await supabase
    .from(tableName)
    .select("approval_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !roleProfile) {
    return { user, role, approvalStatus: "pending" };
  }

  const approvalStatus = roleProfile.approval_status as "pending" | "approved" | "rejected";
  return { user, role, approvalStatus };
};

// 1. Protected Route Guard (For Dashboards & Admin)
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();
  const [status, setStatus] = useState<UserAuthStatus>({
    loading: true,
    user: null,
    role: null,
    approvalStatus: null,
  });

  useEffect(() => {
    let isMounted = true;
    fetchUserAuthStatus().then((res) => {
      if (isMounted) {
        setStatus({ loading: false, ...res });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (status.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D4A017] border-t-transparent"></div>
          <p className="text-muted-foreground text-sm font-medium animate-pulse">
            Verifying credentials, please wait...
          </p>
        </div>
      </div>
    );
  }

  // If unauthenticated -> redirect to /login
  if (!status.user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If role is admin -> redirect to /admin if they try to access volunteer/ngo/donor dashboards
  if (status.role === "admin") {
    if (allowedRoles.includes("admin")) {
      return <>{children}</>;
    }
    return <Navigate to="/admin" replace />;
  }

  // If non-admin user is pending or rejected -> redirect to /pending holding page
  if (status.approvalStatus === "pending" || status.approvalStatus === "rejected") {
    return <Navigate to="/pending" replace />;
  }

  // If approved and the role is allowed -> let them in
  if (status.role && allowedRoles.includes(status.role)) {
    return <>{children}</>;
  }

  // If role is approved but trying to access unauthorized dashboard -> redirect to correct dashboard
  if (status.role === "volunteer") return <Navigate to="/dashboard/volunteer" replace />;
  if (status.role === "ngo") return <Navigate to="/dashboard/ngo" replace />;
  if (status.role === "donor") return <Navigate to="/dashboard/donor" replace />;

  return <Navigate to="/login" replace />;
};

// 2. Public Route Guard (For /login, /register, etc. - authenticated users cannot visit these)
interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
  const [status, setStatus] = useState<UserAuthStatus>({
    loading: true,
    user: null,
    role: null,
    approvalStatus: null,
  });

  useEffect(() => {
    let isMounted = true;
    fetchUserAuthStatus().then((res) => {
      if (isMounted) {
        setStatus({ loading: false, ...res });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (status.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D4A017] border-t-transparent"></div>
      </div>
    );
  }

  // If authenticated -> redirect to respective portal
  if (status.user) {
    if (status.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (status.approvalStatus === "pending" || status.approvalStatus === "rejected") {
      return <Navigate to="/pending" replace />;
    }
    if (status.role === "volunteer") return <Navigate to="/dashboard/volunteer" replace />;
    if (status.role === "ngo") return <Navigate to="/dashboard/ngo" replace />;
    if (status.role === "donor") return <Navigate to="/dashboard/donor" replace />;
  }

  return <>{children}</>;
};

// 3. Pending Route Guard (Only unapproved/pending accounts can visit /pending)
interface PendingRouteProps {
  children: React.ReactNode;
}

export const PendingRoute = ({ children }: PendingRouteProps) => {
  const [status, setStatus] = useState<UserAuthStatus>({
    loading: true,
    user: null,
    role: null,
    approvalStatus: null,
  });

  useEffect(() => {
    let isMounted = true;
    fetchUserAuthStatus().then((res) => {
      if (isMounted) {
        setStatus({ loading: false, ...res });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (status.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D4A017] border-t-transparent"></div>
      </div>
    );
  }

  // If unauthenticated -> redirect to /login
  if (!status.user) {
    return <Navigate to="/login" replace />;
  }

  // If admin -> redirect to /admin
  if (status.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  // If approved -> redirect to respective dashboard
  if (status.approvalStatus === "approved") {
    if (status.role === "volunteer") return <Navigate to="/dashboard/volunteer" replace />;
    if (status.role === "ngo") return <Navigate to="/dashboard/ngo" replace />;
    if (status.role === "donor") return <Navigate to="/dashboard/donor" replace />;
  }

  // If pending or rejected -> show holding page
  return <>{children}</>;
};
