import { redirect } from "next/navigation";
import { getHouseholdContext } from "@/lib/households/context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getHouseholdContext();
  if (!ctx) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar
        households={ctx.households}
        activeHouseholdId={ctx.activeHousehold?.householdId ?? null}
        displayName={ctx.displayName}
        email={ctx.email}
        avatarUrl={ctx.avatarUrl}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">
            {ctx.activeHousehold ? ctx.activeHousehold.householdName : "Personal"}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
