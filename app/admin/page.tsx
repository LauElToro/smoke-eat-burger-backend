async function fetchJSON(path){
  const res = await fetch(path, { cache: 'no-store' });
  return res.json();
}

export default async function AdminPage(){
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const metrics = await fetchJSON(`${base}/api/metrics/daily`);
  const low = await fetchJSON(`${base}/api/inventory/low-stock`);

  return (
    <main className="p-6" style={{display:'flex', flexDirection:'column', gap:24}}>
      <h1 style={{fontSize:28, fontWeight:'bold'}}>Panel administrativo</h1>

      <section style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:16}}>
        <Card title="Ventas (hoy)" value={`$ ${Math.round(metrics.revenue||0).toLocaleString('es-AR')}`} />
        <Card title="COGS" value={`$ ${Math.round(metrics.cogs||0).toLocaleString('es-AR')}`} />
        <Card title="Margen bruto" value={`$ ${Math.round(metrics.grossProfit||0).toLocaleString('es-AR')}`} />
        <Card title="Margen neto" value={`$ ${Math.round(metrics.netProfit||0).toLocaleString('es-AR')}`} />
      </section>

      <section>
        <h2 style={{fontSize:18, fontWeight:600, marginBottom:8}}>Reponer stock</h2>
        <div style={{overflowX:'auto'}}>
          <table className="min-w-full" style={{border:'1px solid #E5E7EB', borderRadius:12}}>
            <thead>
              <tr style={{textAlign:'left', background:'#F9FAFB'}}>
                <th className="p-2" style={{padding:8}}>SKU</th>
                <th className="p-2" style={{padding:8}}>Nombre</th>
                <th className="p-2" style={{padding:8}}>SOH</th>
                <th className="p-2" style={{padding:8}}>Punto de reposición</th>
              </tr>
            </thead>
            <tbody>
              {low.lowStock?.map((r)=> (
                <tr key={r.id} className="border-t" style={{borderTop:'1px solid #E5E7EB'}}>
                  <td className="p-2" style={{padding:8}}>{r.sku}</td>
                  <td className="p-2" style={{padding:8}}>{r.name}</td>
                  <td className="p-2" style={{padding:8}}>{r.soh}</td>
                  <td className="p-2" style={{padding:8}}>{r.reorderPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Card({title, value}){
  return (
    <div style={{border:'1px solid #E5E7EB', borderRadius:16, padding:16}}>
      <div style={{color:'#6B7280', fontSize:12}}>{title}</div>
      <div style={{fontSize:22, fontWeight:'bold'}}>{value}</div>
    </div>
  );
}
