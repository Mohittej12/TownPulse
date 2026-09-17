import Link from "next/link";
import { LayoutDashboard, Smartphone } from "lucide-react";
import { Card, TactileButton } from "@/components/ui/primitives";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl flex flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-brand border-b-4 border-brand-dark flex items-center justify-center text-white font-display font-semibold text-xl">
            TP
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink">TownPulse</h1>
          <p className="text-ink-soft max-w-md">
            Live, gamified engagement for townhalls, meetings, and workshops.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 w-full">
          <Card className="p-6 flex flex-col items-center gap-3">
            <LayoutDashboard className="text-brand-deep" size={28} aria-hidden="true" />
            <h2 className="font-display font-semibold text-ink">I'm hosting</h2>
            <p className="text-sm text-ink-soft">Build a quiz and launch a live session for your room.</p>
            <Link href="/admin" className="w-full">
              <TactileButton className="w-full">Go to admin</TactileButton>
            </Link>
          </Card>

          <Card className="p-6 flex flex-col items-center gap-3">
            <Smartphone className="text-brand-deep" size={28} aria-hidden="true" />
            <h2 className="font-display font-semibold text-ink">I'm joining</h2>
            <p className="text-sm text-ink-soft">Scan the room's QR code, or enter the PIN yourself.</p>
            <Link href="/join" className="w-full">
              <TactileButton variant="white" className="w-full">
                Join a session
              </TactileButton>
            </Link>
          </Card>
        </div>

        <p className="text-xs text-ink-faint">
          Use the demo switcher in the corner to jump between the admin, host stage, and participant views while
          you're building.
        </p>
      </div>
    </main>
  );
}
