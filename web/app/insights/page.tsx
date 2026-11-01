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

export default function InsightsPage() {
  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="Dashboard + weekly summary + eval accuracy. (Wiring in T11 and T15.)"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="text-2xl mb-2">📊</div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Conversion funnel and channel breakdown. (Wiring in T11.)
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="text-2xl mb-2">📅</div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">
            Weekly Summary
          </h2>
          <p className="text-sm text-slate-500">
            AI-generated weekly executive report. (Wiring in T11.)
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="text-2xl mb-2">🎯</div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">
            Eval Accuracy
          </h2>
          <p className="text-sm text-slate-500">
            LLM evaluation benchmark against gold labels. (Wiring in T15.)
          </p>
        </div>
      </div>
    </div>
  );
}
