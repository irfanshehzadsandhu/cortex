import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-6 px-6 py-3 border-b shrink-0">
        <span className="font-bold tracking-tight">Cortex</span>
        <Separator orientation="vertical" className="h-5" />
        <nav className="flex gap-4 text-sm">
          <Link href="/documents" className="text-muted-foreground hover:text-foreground transition-colors">
            Documents
          </Link>
          <Link href="/chat" className="text-muted-foreground hover:text-foreground transition-colors">
            Chat
          </Link>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
