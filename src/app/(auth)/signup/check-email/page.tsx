import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <MailCheck className="mb-2 h-10 w-10 text-primary" />
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We&apos;ve sent you a confirmation link. Click it to activate your account and sign in.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
