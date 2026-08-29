"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUser, StrapiUser } from "@/lib/auth";

interface RoleGuardProps {
  allowedRoles: string[];
  children: (user: StrapiUser) => React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const [user, setUser] = useState<StrapiUser | null>(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const current = getUser();

    if (!current) {
      // Send the user to login, then straight back to the page they were
      // trying to reach once they're signed in.
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!allowedRoles.includes(current.role?.name || "")) {
      router.push("/");
      return;
    }

    setUser(current);
    setChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked || !user) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return <>{children(user)}</>;
}