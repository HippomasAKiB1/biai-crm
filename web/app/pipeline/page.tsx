import { STAGES, STAGE_COLORS } from "@/lib/config";

function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle="five column headers only, using STAGES + STAGE_COLORS. (Card rendering in T08.)"
      />

      {/* Horizontal scroll container on mobile, flex grid on desktop */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[750px] md:min-w-0">
          {STAGES.map((stage) => {
            const badgeColor = STAGE_COLORS[stage] || "bg-slate-100 text-slate-700";
            return (
              <div
                key={stage}
                className="flex-1 min-w-[200px] bg-slate-100/70 rounded-xl border border-slate-200/80 p-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md ${badgeColor}`}
                  >
                    {stage}
                  </span>
                  <span className="text-xs font-medium text-slate-400">0</span>
                </div>

                <div className="bg-white/60 border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-400">
                  (Card rendering in T08.)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
