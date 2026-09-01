import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RootPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-black">PURRPOSE</CardTitle>
          <CardDescription>
            Track hustle & humble — stay balanced, stay productive.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2 justify-center">
            <div className="h-4 w-4 bg-hustle border-2 border-border" />
            <div className="h-4 w-4 bg-humble border-2 border-border" />
            <div className="h-4 w-4 bg-accent border-2 border-border" />
            <div className="h-4 w-4 bg-info border-2 border-border" />
          </div>
          <p className="text-sm">
            Neo brutalism palette verified — M0 Hello World
          </p>
          <div className="flex gap-2 justify-center mt-2">
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button variant="neutral" asChild>
              <Link href="/home">Home (app)</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
