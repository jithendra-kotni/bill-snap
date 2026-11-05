import { useState } from 'react';

function getBillMonth(bill) {
  if (bill.date && typeof bill.date === 'string' && /^\d{4}-\d{2}/.test(bill.date)) {
    return bill.date.slice(0, 7);
  }
  const d = new Date(bill.date || bill.createdAt);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  return null;
}

function formatMonth(mKey) {
  if (!mKey || mKey === 'All') return 'All';
  const [year, month] = mKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

export default function BillList({ bills = [], onDelete, onEdit }) {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  if (!bills.length) {
    return <p className="empty">No bills saved yet. Snap your first one!</p>;
  }

  const months = Array.from(new Set(bills.map(getBillMonth).filter(Boolean))).sort().reverse();

  // Search by merchant & filter by month
  const q = search.trim().toLowerCase();
  const filteredBills = bills.filter((b) => {
    const matchMerchant = !q || (b.merchant && b.merchant.toLowerCase().includes(q));
    const matchMonth = selectedMonth === 'All' || getBillMonth(b) === selectedMonth;
    return matchMerchant && matchMonth;
  });

  // Spending summary follows the month filter
  const summaryBills = bills.filter((b) => selectedMonth === 'All' || getBillMonth(b) === selectedMonth);
  const byCat = {};
  summaryBills.forEach((b) => {
    const cat = b.category || 'Other';
    byCat[cat] = (byCat[cat] || 0) + (Number(b.total) || 0);
  });
  const total = Object.values(byCat).reduce((a, b) => a + b, 0);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isThisMonth = selectedMonth === currentMonthKey;
  const summaryTitle = selectedMonth === 'All'
    ? `Total spending: ₹${total.toFixed(2)}`
    : isThisMonth
      ? `This month: ₹${total.toFixed(2)}`
      : `${formatMonth(selectedMonth)}: ₹${total.toFixed(2)}`;

  function handleExportCsv() {
    const headers = ['merchant', 'date', 'total', 'category'];
    const escapeCsv = (val) => {
      if (val == null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredBills.map((b) => [
      escapeCsv(b.merchant ?? ''),
      escapeCsv(b.date ?? ''),
      escapeCsv(b.total != null ? Number(b.total).toFixed(2) : ''),
      escapeCsv(b.category ?? ''),
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bills.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function toggleRow(id) {
    setExpandedId((curr) => (curr === id ? null : id));
  }

  return (
    <div>
      <div className="card bill-controls">
        <div className="controls-row">
          <input
            type="search"
            className="search-input"
            placeholder="Search merchant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search merchant"
          />
          <select
            className="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Filter by month"
          >
            <option value="All">All</option>
            {months.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>
        <button type="button" className="secondary export-btn" onClick={handleExportCsv}>
          Export CSV
        </button>
      </div>

      {total > 0 && (
        <div className="card">
          <h2>{summaryTitle}</h2>
          {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, amt]) => (
            <div key={c} className="bar">
              <span>{c}</span>
              <div><i style={{ width: `${(amt / total) * 100}%` }} /></div>
              <b>₹{amt.toFixed(0)}</b>
            </div>
          ))}
        </div>
      )}

      {filteredBills.length === 0 ? (
        <p className="empty">No bills match your filter.</p>
      ) : (
        filteredBills.map((b) => {
          const hasWarn = Array.isArray(b.audit) && b.audit.some((a) => a?.severity === 'warn');
          const isExpanded = expandedId === b.id;

          return (
            <div key={b.id} className="bill-card">
              <div
                className="bill"
                onClick={() => toggleRow(b.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleRow(b.id);
                  }
                }}
              >
                {b.thumb && <img src={b.thumb} alt="" />}
                <div className="info">
                  <div className="bill-title-row">
                    <b>{b.merchant || 'Unknown'}</b>
                    {hasWarn && <span className="review-badge">Review</span>}
                  </div>
                  <div className="bill-meta">
                    <small>{b.date || 'No date'}</small>
                    {b.category && <span className="category-pill">{b.category}</span>}
                  </div>
                </div>
                <div className="amt">₹{Number(b.total || 0).toFixed(2)}</div>
                {onEdit && (
                  <button
                    type="button"
                    className="secondary"
                    style={{ minHeight: '36px', padding: '6px 10px', fontSize: '13px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(b);
                    }}
                    aria-label="Edit"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="x"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(b.id);
                  }}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>

              {isExpanded && b.audit && b.audit.length > 0 && (
                <div className="bill-audit">
                  {b.audit.map((a, i) => (
                    <div key={i} className={'audit-title' + (a.severity === 'warn' ? ' warn' : '')}>
                      {a.severity === 'warn' ? '⚠ ' : '• '}{a.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
