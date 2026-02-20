import { useEffect, useState } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { Flag, CheckCircle, Eye, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const { reports, fetchReports, resolveReport, loading } = useAdminStore();
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    fetchReports(statusFilter);
  }, [statusFilter, fetchReports]);

  const handleResolve = async (id, status) => {
    try {
      await resolveReport(id, status);
      toast.success('Report updated');
    } catch { toast.error('Failed to update report'); }
  };

  return (
    <div className="page-admin-reports">
      <h1 className="font-display" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        <Flag size={20} className="text-red" />{' '}
        <span className="text-red">CONTENT</span> REPORTS
      </h1>

      <div className="browse-filter-group" style={{ marginBottom: '1rem' }}>
        {['pending', 'reviewed', 'resolved'].map((s) => (
          <button
            key={s}
            className={`cyber-btn ${statusFilter === s ? 'cyber-btn--filled' : ''}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            onClick={() => setStatusFilter(s)}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="hud-line" />

      {loading ? (
        <div className="page-center"><div className="cyber-spinner" /></div>
      ) : reports.length === 0 ? (
        <div className="page-center">
          <CheckCircle size={48} className="text-green" />
          <p className="font-mono text-dim" style={{ marginTop: '1rem' }}>
            No {statusFilter} reports
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reports.map((r) => (
            <div key={r.id} className="cyber-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div className="font-mono" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={12} className="text-red" />{' '}
                    Reported by <span className="text-cyan">@{r.reporter_name}</span>
                    {r.media_title && (
                      <span className="text-dim"> on "{r.media_title}" ({r.media_type})</span>
                    )}
                  </div>
                  <p style={{ marginBottom: '0.5rem' }}>{r.reason}</p>
                  <span className="font-mono text-dim" style={{ fontSize: '0.7rem' }}>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>

                {statusFilter === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="cyber-btn"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
                      onClick={() => handleResolve(r.id, 'reviewed')}
                    >
                      <Eye size={12} /> REVIEW
                    </button>
                    <button
                      className="cyber-btn cyber-btn--green"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
                      onClick={() => handleResolve(r.id, 'resolved')}
                    >
                      <CheckCircle size={12} /> RESOLVE
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
