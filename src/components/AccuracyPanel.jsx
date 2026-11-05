export default function AccuracyPanel({ bills = [] }) {
  const total = bills.length;

  const fields = [
    { key: 'merchant', label: 'Merchant' },
    { key: 'date', label: 'Date' },
    { key: 'total', label: 'Total' },
    { key: 'category', label: 'Category' },
  ];

  if (!total) {
    return (
      <div className="card center">
        <p>No bills saved yet.</p>
        <small>Snap or upload bills to view extraction accuracy.</small>
      </div>
    );
  }

  const stats = fields.map(({ key, label }) => {
    const correctedCount = bills.filter(
      (b) => Array.isArray(b.corrected) && b.corrected.includes(key)
    ).length;
    const percent = Math.round((correctedCount / total) * 100);
    return { key, label, correctedCount, percent };
  });

  return (
    <div className="card accuracy-panel">
      <h2>Extraction Accuracy</h2>
      <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Fields requiring user correction out of {total} saved {total === 1 ? 'bill' : 'bills'}:
      </p>

      {stats.map(({ key, label, correctedCount, percent }) => (
        <div key={key} className="accuracy-field" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{label}</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {correctedCount} of {total} corrected ({percent}%)
            </span>
          </div>
          <div className="bar" style={{ margin: 0, gridTemplateColumns: '1fr' }}>
            <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-subtle)' }}>
              <i
                style={{
                  display: 'block',
                  height: '100%',
                  borderRadius: '4px',
                  width: `${percent}%`,
                  background: correctedCount > 0 ? 'var(--warn-text)' : 'var(--accent)',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

