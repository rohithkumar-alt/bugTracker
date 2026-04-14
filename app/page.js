"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, capitalizeName } from './components/AuthProvider';
import { Bug, ArrowRight, User, GitPullRequest, AlertCircle, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import GlobalHeader from './components/GlobalHeader';
import LoadingOverlay from './components/LoadingOverlay';

export default function DashboardPage() {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentReporter } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/bugs');
        if (!res.ok) { setBugs([]); return; }
        const data = await res.json();
        const bugsArr = Array.isArray(data) ? data : (data.bugs || []);
        let sortedBugs = bugsArr.sort((a, b) => {
          const numA = parseInt(a.id.replace(/\D/g, '') || '0');
          const numB = parseInt(b.id.replace(/\D/g, '') || '0');
          return numB - numA;
        });
        setBugs(sortedBugs);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ----------------------------------------------------
  // METRICS & CALCULATIONS
  // ----------------------------------------------------

  const {
    myBugs
  } = useMemo(() => {

    // Assigned to Me
    const toName = (v) => {
      if (typeof v === 'object' && v !== null) return v.name || '';
      if (typeof v === 'string' && v.startsWith('{')) { try { return JSON.parse(v).name || v; } catch { return v; } }
      return v || '';
    };
    const userBugs = bugs.filter(b => toName(b.assignee) === currentReporter);
    const myBugs = userBugs.filter(b => b.status !== 'Resolved').slice(0, 10);

    return {
      myBugs
    };
  }, [bugs, currentReporter]);

  const [draggedBug, setDraggedBug] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [columnPages, setColumnPages] = useState({});
  const KANBAN_PAGE_SIZE = 5;

  const kanbanColumns = useMemo(() => {
    const toName = (v) => {
      if (typeof v === 'object' && v !== null) return v.name || '';
      if (typeof v === 'string' && v.startsWith('{')) { try { return JSON.parse(v).name || v; } catch { return v; } }
      return v || '';
    };
    const cols = {
      'Open': { label: 'Open', color: '#3b82f6', bugs: [] },
      'In Progress': { label: 'In Progress', color: '#f59e0b', bugs: [] },
      'In PR': { label: 'In PR', color: '#8b5cf6', bugs: [] },
      'In Testing': { label: 'In Testing', color: '#06b6d4', bugs: [] },
      'Resolved': { label: 'Resolved', color: '#10b981', bugs: [] }
    };
    const aliasMap = {
      'Code Review': 'In PR',
      'Review': 'In PR',
      'In Review': 'In PR',
      'UAT': 'In Testing',
      'Testing': 'In Testing',
      'QA': 'In Testing',
      'Closed': 'Resolved',
      'ReOpen': 'Open'
    };
    bugs.forEach(bug => {
      const raw = bug.status || 'Open';
      const mapped = cols[raw] ? raw : (aliasMap[raw] || 'Open');
      cols[mapped].bugs.push(bug);
    });
    return cols;
  }, [bugs]);

  const handleKanbanDrop = async (targetStatus) => {
    if (!draggedBug || draggedBug.status === targetStatus) { setDraggedBug(null); setDragOverColumn(null); return; }
    const updated = { ...draggedBug, status: targetStatus, updatedBy: currentReporter };
    setBugs(prev => prev.map(b => b.id === draggedBug.id ? { ...b, status: targetStatus } : b));
    setDraggedBug(null);
    setDragOverColumn(null);
    try {
      await fetch('/api/bugs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      setBugs(prev => prev.map(b => b.id === draggedBug.id ? draggedBug : b));
    }
  };

  const getShortId = (id) => `BUG-${String(id).split('-')[1]?.substring(0, 4)?.toUpperCase() || ''}`;

  if (loading) return <LoadingOverlay message="Preparing Mission Control" subtext="Analyzing team performance and bug priority..." />;

  return (
    <main style={{ padding: '20px 20px 80px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <GlobalHeader />
      </div>

      <header style={{ marginBottom: 'clamp(20px, 4vw, 40px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-surface))', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mission Control
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)', fontWeight: '600', color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
          Welcome back, {capitalizeName(currentReporter)}
        </h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 500px), 1fr))', gap: '24px' }}>

        {/* Assigned to Me */}
        <section style={{ backgroundColor: 'var(--color-bg-surface)', padding: '32px', borderRadius: '24px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Your Desk</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontWeight: '500', marginTop: '4px' }}>Tasks currently assigned to you</p>
            </div>
            <Link href="/bugs" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myBugs.map(bug => (
              <Link href={`/bugs?bug=${bug.id}`} key={bug.id} className="item-row" style={{
                padding: '16px 20px', backgroundColor: 'var(--color-bg-body)', borderRadius: '14px', border: '1px solid var(--color-border)', textDecoration: 'none', transition: 'all 0.2s', display: 'block'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' }}>{bug.title}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: '600', padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', textTransform: 'uppercase' }}>{bug.status}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>{bug.id} • {bug.project || 'General'}</div>
                  {bug.priority?.toLowerCase() === 'critical' && <span style={{ padding: '2px 8px', backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '0.65rem', borderRadius: '6px', fontWeight: '600' }}>CRITICAL</span>}
                </div>
              </Link>
            ))}
            {myBugs.length === 0 && <div style={{ fontSize: '0.9rem', color: '#10b981', backgroundColor: 'var(--color-bg-body)', padding: '24px', borderRadius: '14px', textAlign: 'center', fontWeight: '600' }}>You have no pending tasks. Great job!</div>}
          </div>
        </section>

      </div>

      {/* Kanban Board */}
      <section style={{ marginTop: '40px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Kanban Board</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontWeight: '500' }}>Drag bugs between columns to update status</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px', minHeight: '300px' }}>
          {Object.entries(kanbanColumns).map(([status, col]) => (
            <div
              key={status}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(status); }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={() => handleKanbanDrop(status)}
              style={{
                backgroundColor: dragOverColumn === status ? `${col.color}10` : 'var(--color-bg-surface)',
                borderRadius: '20px',
                border: dragOverColumn === status ? `2px dashed ${col.color}` : '1px solid var(--color-border)',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '520px',
                transition: 'all 0.2s',
                overflow: 'hidden'
              }}
            >
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: col.color }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: '700', padding: '2px 10px',
                  borderRadius: '99px', backgroundColor: `${col.color}15`, color: col.color
                }}>{col.bugs.length}</span>
              </div>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(col.bugs.length / KANBAN_PAGE_SIZE));
                const currentPage = Math.min(columnPages[status] || 0, totalPages - 1);
                const pagedBugs = col.bugs.slice(currentPage * KANBAN_PAGE_SIZE, (currentPage + 1) * KANBAN_PAGE_SIZE);
                return (
              <div style={{ padding: '12px', overflowY: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {col.bugs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--color-text-light)', fontSize: '0.75rem', fontStyle: 'italic' }}>No bugs</div>
                )}
                {pagedBugs.map(bug => (
                  <Link
                    href={`/bugs?bug=${bug.id}`}
                    key={bug.id}
                    draggable
                    onDragStart={() => setDraggedBug(bug)}
                    onDragEnd={() => { setDraggedBug(null); setDragOverColumn(null); }}
                    className="kanban-card"
                    style={{
                      display: 'block',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-bg-body)',
                      border: '1px solid var(--color-border-light)',
                      cursor: 'grab',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      opacity: draggedBug?.id === bug.id ? 0.4 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <GripVertical size={14} color="var(--color-text-light)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bug.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--color-text-light)' }}>{getShortId(bug.id)}</span>
                          <span style={{
                            fontSize: '0.6rem', fontWeight: '700', padding: '1px 6px', borderRadius: '4px',
                            backgroundColor: bug.priority?.toLowerCase() === 'critical' ? '#fee2e2' : bug.priority?.toLowerCase() === 'high' ? '#ffedd5' : '#f1f5f9',
                            color: bug.priority?.toLowerCase() === 'critical' ? '#dc2626' : bug.priority?.toLowerCase() === 'high' ? '#ea580c' : '#64748b'
                          }}>{bug.priority}</span>
                          {bug.endDate && new Date(bug.endDate) < new Date() && !['Resolved', 'Closed'].includes(bug.status) && (
                            <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#dc2626' }}>OVERDUE</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {col.bugs.length > KANBAN_PAGE_SIZE && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', marginTop: '4px', borderTop: '1px solid var(--color-border-light)' }}>
                    <button
                      onClick={() => setColumnPages(p => ({ ...p, [status]: Math.max(0, currentPage - 1) }))}
                      disabled={currentPage === 0}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '24px', height: '24px', borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-surface)',
                        color: 'var(--color-text-main)',
                        cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 0 ? 0.4 : 1
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                      {currentPage * KANBAN_PAGE_SIZE + 1}–{Math.min((currentPage + 1) * KANBAN_PAGE_SIZE, col.bugs.length)} of {col.bugs.length}
                    </span>
                    <button
                      onClick={() => setColumnPages(p => ({ ...p, [status]: Math.min(totalPages - 1, currentPage + 1) }))}
                      disabled={currentPage >= totalPages - 1}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '24px', height: '24px', borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-surface)',
                        color: 'var(--color-text-main)',
                        cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage >= totalPages - 1 ? 0.4 : 1
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
                );
              })()}
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .loading-screen {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--color-text-muted);
        }
        .kanban-card:hover {
          border-color: var(--color-primary) !important;
          box-shadow: 0 2px 8px rgba(37,99,235,0.1);
          transform: translateY(-1px);
        }
        .item-row:hover {
          border-color: var(--color-primary) !important;
          box-shadow: 0 4px 6px -1px rgba(37,99,235,0.1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
