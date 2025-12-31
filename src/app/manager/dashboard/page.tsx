
"use client";
import useSWR from "swr";
const fetcher = (url:string)=>fetch(url).then(r=>r.json());

export default function ManagerDashboard() {
  const { data: kpis } = useSWR("/api/dashboard/kpis", fetcher, { refreshInterval: 15000 });
  const { data: tasks } = useSWR("/api/dashboard/tasks?status[]=Open&status[]=In-Progress&limit=30", fetcher, { refreshInterval: 15000 });
  const { data: low }   = useSWR("/api/dashboard/low-stock?limit=25", fetcher, { refreshInterval: 60000 });
  const { data: inv }   = useSWR("/api/dashboard/recent-invoices?limit=10", fetcher);
  const { data: qual }  = useSWR("/api/dashboard/quality-trend?days=14", fetcher);

  return (
    <div className="p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi title="Open" value={kpis?.tasks.open} />
        <Kpi title="In-Progress" value={kpis?.tasks.inProgress} />
        <Kpi title="Low Stock" value={kpis?.lowStockCount} warn />
        <Kpi title="₪ Invoices (wk)" value={kpis?.invoicesThisWeek?.totalNis?.toFixed(2)} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card title="Tasks">
          <TaskList tasks={tasks ?? []} />
        </Card>

        <Card title="Low Inventory" className="xl:col-span-2">
          <LowStockTable rows={low ?? []} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card title="Recent Invoices">
          <InvoiceList rows={inv ?? []} />
        </Card>

        <Card title="Quality Trend" className="xl:col-span-2">
          {/* render a simple SVG or a tiny library chart; keep SSR-friendly */}
          <QualityMiniChart data={qual ?? []} />
        </Card>
      </div>
    </div>
  );
}

function Card({title, children, className=""}:{title:string; children:any; className?:string}) {
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl p-4 ${className}`}>
      <div className="text-gray-200 font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}
function Kpi({title, value, warn}:{title:string; value:any; warn?:boolean}) {
  return (
    <div className={`rounded-xl p-4 border ${warn?"border-red-500":"border-gray-700"} bg-gray-900`}>
      <div className="text-gray-400 text-sm">{title}</div>
      <div className="text-2xl text-gray-100 font-bold">{value ?? "—"}</div>
    </div>
  );
}
function TaskList({tasks}:{tasks:any[]}) {
  return (
    <ul className="divide-y divide-gray-800">
      {tasks.map(t=>(
        <li key={t._id} className="py-2 flex items-center justify-between">
          <div className="text-gray-100">{t.name}</div>
          <div className="text-sm text-gray-400">{t.produced}/{t.planned}</div>
        </li>
      ))}
      {tasks.length===0 && <div className="text-gray-500 text-sm">No tasks</div>}
    </ul>
  );
}
function LowStockTable({rows}:{rows:any[]}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-gray-300">
          <tr>
            <th className="text-left py-2">Item</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Min</th>
            <th className="text-right">Δ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r:any)=> {
            const delta = (r.quantity ?? 0) - (r.minQuantity ?? 0);
            const color = delta <= 0 ? "text-red-400" : delta <= (r.minQuantity*0.25) ? "text-amber-400" : "text-gray-200";
            return (
              <tr key={r._id} className="border-t border-gray-800">
                <td className="py-2 text-gray-100">{r.itemName}</td>
                <td className="text-right text-gray-200">{r.quantity}</td>
                <td className="text-right text-gray-400">{r.minQuantity}</td>
                <td className={`text-right ${color}`}>{delta}</td>
                <td className="text-right">
                  <button className="text-blue-400 hover:underline">Open</button>
                </td>
              </tr>
            );
          })}
          {rows.length===0 && <tr><td className="py-3 text-gray-500" colSpan={5}>All good ✅</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
function InvoiceList({rows}:{rows:any[]}) {
  return (
    <ul className="divide-y divide-gray-800">
      {rows.map((r:any)=>(
        <li key={r._id} className="py-2 flex items-center justify-between">
          <div className="text-gray-100">{r.supplierName} • {r.documentType}</div>
          <div className="text-sm text-gray-400">₪{r.totalCost?.toFixed(2)}</div>
        </li>
      ))}
      {rows.length===0 && <div className="text-gray-500 text-sm">No invoices</div>}
    </ul>
  );
}
function QualityMiniChart({data}:{data:{date:string, produced:number, defected:number}[]}) {
  // keep simple for now; you can swap in a chart lib later
  return <pre className="text-xs text-gray-400 overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
}
