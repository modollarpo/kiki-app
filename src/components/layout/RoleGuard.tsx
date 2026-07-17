"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      // If not logged in, auth guard should handle it, but we can also redirect.
      setIsAuthorized(false);
      router.push("/auth/login");
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      setIsAuthorized(false);
      router.push("/dashboard");
    } else {
      setIsAuthorized(true);
    }
  }, [user, allowedRoles, router]);

  if (isAuthorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#030712]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#10b981] border-t-transparent" />
      </div>
    );
  }

  if (isAuthorized === false) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
