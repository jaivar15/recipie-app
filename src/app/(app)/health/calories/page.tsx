import { PieChart } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function CaloriesMacrosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calories &amp; Macros</h1>
        <p className="text-sm text-muted-foreground">Today's intake against your targets.</p>
      </div>
      <EmptyState
        icon={PieChart}
        title="Coming next"
        description="This dashboard lights up once the Food Diary is logging entries."
      />
    </div>
  );
}
