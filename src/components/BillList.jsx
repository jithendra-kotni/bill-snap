export default function BillList({ bills, onDelete }) {
  const now = new Date();
  const thisMonth = bills.filter((b) => {
    const d = new Date(b.date || b.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const byCat = {};
  thisMonth.forEach((b) => { byCat[b.category] = (byCat[b.category] || 0) + b.total; });
  const total = Object.values(byCat).reduce((a, b) => a + b, 0);

  if (!bills.length) return <p className="empty">No bills saved yet. Snap your first one!</p>;

  return (
    <div>
      {total > 0 && (
        <div className="card">
          <h2>This month: ₹{total.toFixed(2)}</h2>
          {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, amt]) => (
            <div key={c} className="bar">
              <span>{c}</span>
              <div><i style={{ width: `${(amt / total) * 100}%` }} /></div>
              <b>₹{amt.toFixed(0)}</b>
            </div>
          ))}
        </div>
      )}
      {bills.map((b) => (
        <div key={b.id} className="bill">
          {b.thumb && <img src={b.thumb} alt="" />}
          <div className="info">
            <b>{b.merchant}</b>
            <small>{b.date || 'No date'} · {b.category}</small>
          </div>
          <div className="amt">₹{b.total.toFixed(2)}</div>
          <button className="x" onClick={() => onDelete(b.id)} aria-label="Delete">✕</button>
        </div>
      ))}
    </div>
  );
}