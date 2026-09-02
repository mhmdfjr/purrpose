"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs hidden sm:inline">{user.email}</span>
      <Button
        size="sm"
        className="bg-hustle text-white font-black"
        onClick={async () => {
          await signOut();
          router.push("/login");
        }}
      >
        Logout
      </Button>
    </div>
  );
}
