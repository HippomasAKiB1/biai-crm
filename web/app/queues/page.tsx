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

export default function QueuesPage() {
  return (
    <div>
      <PageHeader
        title="Queues"
        subtitle="Support Queue and Not-a-lead. (Wiring in T10.)"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="text-2xl mb-2">🎧</div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">
            Support Queue
          </h2>
          <p className="text-sm text-slate-500">
            Support and refund enquiries needing resolution. (Wiring in T10.)
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="text-2xl mb-2">🚫</div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">
            Not-a-lead Queue
          </h2>
          <p className="text-sm text-slate-500">
            Spam, job seekers, and minor enquiries filtered out. (Wiring in T10.)
          </p>
        </div>
      </div>
    </div>
  );
}
