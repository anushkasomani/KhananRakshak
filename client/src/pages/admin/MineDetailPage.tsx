import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { api } from '../../services/api';
import { Mine, User, Role } from '../../types';
import { PageHeader, Section, Stat, Empty, ListSkeleton } from '../../components/ui';
import { MinesMap } from '../../components/MineMap';
import { MineEditor } from './AdminMinesPage';
import { PersonEditor } from './AdminPeoplePage';
import { ROLES, TRADES, describeRole } from '../../roles';

const PLURAL: Record<Role, string> = {
  WORKER: 'Workers',
  SUPERVISOR: 'Supervisors',
  OFFICER: 'Officers',
  MINE_MANAGER: 'Mine managers',
  PROJECT_MANAGER: 'Project managers',
  DGMS: 'DGMS',
};

export const MineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [mine, setMine] = useState<Mine | null>(null);
  const [people, setPeople] = useState<User[]>([]);
  const [allMines, setAllMines] = useState<Mine[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [editingMine, setEditingMine] = useState(false);
  const [editingPerson, setEditingPerson] = useState<User | null | 'new'>(null);

  const load = async () => {
    if (!id) return;
    try {
      const [m, u, all] = await Promise.all([api.getMine(id), api.getUsers({ mineId: id, status: 'APPROVED' }), api.getMines()]);
      setMine(m);
      setPeople(u);
      setAllMines(all);
    } catch {
      setNotFound(true);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (notFound) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">This mine doesn't exist.</p>
        <Link to="/admin/mines" className="text-sm text-zinc-200 underline">
          Back to mines
        </Link>
      </div>
    );
  }
  if (!mine) return <ListSkeleton />;

  const byRole = (r: Role) => people.filter((p) => p.role === r);
  const workers = byRole('WORKER');
  const tradeCounts = Object.entries(TRADES)
    .map(([k, label]) => ({ label, n: workers.filter((w) => w.trade === k).length }))
    .filter((t) => t.n > 0);
  const managers = byRole('MINE_MANAGER').length + byRole('PROJECT_MANAGER').length;
  const km = mine.radiusMeters >= 1000 ? `${(mine.radiusMeters / 1000).toFixed(1)} km` : `${mine.radiusMeters} m`;

  return (
    <div className="space-y-8">
      <Link to="/admin/mines" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200">
        <ArrowLeft className="w-4 h-4" />
        Mines
      </Link>

      <PageHeader
        title={mine.name}
        description={`${[mine.locality, mine.state].filter(Boolean).join(', ')} · ${mine.code} · ${km} radius`}
        actions={
          <button onClick={() => setEditingMine(true)} className="btn-secondary">
            Edit mine
          </button>
        }
      />

      <MinesMap mines={[mine]} height="h-64" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Workers" value={workers.length} />
        <Stat label="Supervisors" value={byRole('SUPERVISOR').length} />
        <Stat label="Officers" value={byRole('OFFICER').length} />
        <Stat label="Managers" value={managers} />
      </div>

      {tradeCounts.length > 0 && (
        <p className="text-sm text-zinc-500">
          {tradeCounts.map((t, i) => (
            <span key={t.label}>
              {i > 0 && ' · '}
              <span className="text-zinc-300">{t.n}</span> {t.label.toLowerCase()}
              {t.n === 1 ? '' : 's'}
            </span>
          ))}
        </p>
      )}

      <Section
        title="Staff"
        action={
          <button onClick={() => setEditingPerson('new')} className="btn-secondary h-8 px-3">
            <Plus className="w-4 h-4" />
            Add person
          </button>
        }
      >
        {people.length === 0 ? (
          <div className="card">
            <Empty>No one enrolled at this mine yet.</Empty>
          </div>
        ) : (
          <div className="space-y-6">
            {[...ROLES].reverse().map((role) => {
              const group = byRole(role);
              if (group.length === 0) return null;
              return (
                <div key={role}>
                  <p className="text-xs text-zinc-500 mb-2">
                    {PLURAL[role]} · {group.length}
                  </p>
                  <div className="card divide-y divide-white/[0.05] stagger">
                    {group.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setEditingPerson(p)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-200 truncate">{p.name}</p>
                          <p className="mt-0.5 text-xs text-zinc-500 truncate">
                            {role === 'WORKER' || role === 'OFFICER' ? `${describeRole(p)} · ` : ''}
                            {p.phone || p.email}
                          </p>
                        </div>
                        {p.badgeNumber && <span className="hash-pill">{p.badgeNumber}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {editingMine && (
        <MineEditor
          mine={mine}
          onClose={() => setEditingMine(false)}
          onSaved={() => {
            setEditingMine(false);
            load();
          }}
        />
      )}
      {editingPerson && (
        <PersonEditor
          person={editingPerson === 'new' ? null : editingPerson}
          mines={allMines}
          defaults={{ mineId: mine.id, role: 'WORKER' }}
          onClose={() => setEditingPerson(null)}
          onSaved={() => {
            setEditingPerson(null);
            load();
          }}
        />
      )}
    </div>
  );
};

