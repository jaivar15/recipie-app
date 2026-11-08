import { Suspense } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your family&apos;s recipe vault.</CardDescription>
      </CardHeader>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </Card>
  );
}
