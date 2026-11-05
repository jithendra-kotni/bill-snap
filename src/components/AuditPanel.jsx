import './AuditPanel.css';

export function AuditPanel({ findings, show }) {
  if (!show) return null;
  const warns = findings.filter((f) => f.severity === 'warn');
  return (
    <section className="audit">
      <div className="audit-head">
        <h2>Bill check</h2>
        <span className={'audit-count' + (warns.length ? ' has' : '')}>
          {warns.length ? `${warns.length} to review` : 'Nothing unusual'}
        </span>
      </div>
      {findings.length === 0 && (
        <p className="audit-empty">
          We found nothing unusual in the charges we could read. This check can’t catch everything.
        </p>
      )}
      <ul>
        {findings.map((f, i) => (
          <li key={f.code + i} className={'audit-item ' + f.severity}>
            <b>{f.title}</b>
            <p>{f.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AuditAlert({ count, onClose }) {
  return (
    <div className="audit-overlay" role="dialog" aria-modal="true">
      <div className="audit-dialog">
        <h3>Worth a closer look</h3>
        <p>
          We noticed {count} {count === 1 ? 'thing' : 'things'} on this bill that may be worth checking before you save it.
        </p>
        <button onClick={onClose}>Review</button>
      </div>
    </div>
  );
}