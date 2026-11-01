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

export default function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <div>
      <PageHeader
        title={`Lead #${id}`}
        subtitle={`Lead #${id} — details, timeline, reply draft. (Wiring in T09.)`}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 max-w-xl mx-auto mt-8 shadow-xs">
        <div className="text-4xl mb-3">👤</div>
        <h2 className="text-base font-semibold text-slate-800 mb-1">
          Lead #{id}
        </h2>
        <p className="text-sm text-slate-500">
          Lead #{id} — details, timeline, reply draft. (Wiring in T09.)
        </p>
      </div>
    </div>
  );
}
