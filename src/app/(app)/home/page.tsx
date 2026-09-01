import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-black">Home — Tasks</h1>
      <p className="text-sm text-foreground/70">
        M0 placeholder: Task management UI akan diimplementasi di M2. Layout dua
        kolom Hustle/Humble siap.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-[var(--color-hustle)]">
          <CardHeader>
            <CardTitle className="text-[var(--color-hustle)]">HUSTLE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No tasks yet. Add your first hustle task!
            </p>
          </CardContent>
        </Card>
        <Card className="border-[var(--color-humble)]">
          <CardHeader>
            <CardTitle className="text-[var(--color-humble)]">HUMBLE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No tasks yet. Add your first humble task!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
