import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const TerminalWindow = dynamic(() => import("@/components/TerminalWindow"), {
  ssr: false,
  loading: () => <div className="p-4 text-gray-400 font-mono animate-pulse">Loading terminal module...</div>
});

export default function TerminalPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex flex-col h-screen min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link href={`/containers/${params.id}`} className="p-2 hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-700">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Interactive Terminal</h1>
        <div className="text-gray-400 font-mono bg-gray-900 px-3 py-1 rounded-md text-sm border border-gray-800">
          {params.id}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-gray-800ring-1 ring-white/10">
        <TerminalWindow containerId={params.id} />
      </div>
    </div>
  );
}
