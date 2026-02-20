import { useEffect } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { ScrollText, Activity } from 'lucide-react';

export default function AdminAuditPage() {
  const { auditLogs, fetchAudit, loading } = useAdminStore();

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const actionColors = {
    ban_user: 'red',
    unban_user: 'green',
    delete_user: 'red',
    change_role: 'magenta',
    change_media_status: 'yellow',
    resolve_report: 'green',
  };

  return (
    <div className="page-admin-audit">
      <h1 className="font-display" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        <ScrollText size={20} className="text-green" />{' '}
        <span className="text-green">AUDIT</span> LOG
      </h1>

      <div className="hud-line" />

      {loading ? (
        <div className="page-center"><div className="cyber-spinner" /></div>
      ) : auditLogs.length === 0 ? (
        <div className="page-center">
          <Activity size={48} className="text-dim" />
          <p className="font-mono text-dim" style={{ marginTop: '1rem' }}>No audit entries</p>
        </div>
      ) : (
        <div className="cyber-card" style={{ overflow: 'auto' }}>
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => {
                const color = actionColors[log.action] || 'cyan';
                return (
                  <tr key={log.id}>
                    <td className="text-dim font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="text-cyan font-mono">
                      {log.username ? `@${log.username}` : 'system'}
                    </td>
                    <td>
                      <span
                        className="cyber-badge"
                        style={{
                          borderColor: `var(--${color})`,
                          color: `var(--${color})`,
                          background: `rgba(var(--${color}), 0.08)`,
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>
                      {log.target_type && `${log.target_type}:${log.target_id?.slice(0, 8) || '?'}`}
                    </td>
                    <td className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
