import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetCheckEmailPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <MailCheck className="mb-2 h-10 w-10 text-primary" />
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          If an account exists for that address, we&apos;ve sent a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
