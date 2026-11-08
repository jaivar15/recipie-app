import Link from "next/link";
import { ChefHat } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-foreground">
        <ChefHat className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">My Family Recipe Vault</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
