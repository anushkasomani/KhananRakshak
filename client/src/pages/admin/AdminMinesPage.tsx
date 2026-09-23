import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../services/api';
import { Mine } from '../../types';
import { PageHeader, Modal, Empty, Field, ListSkeleton } from '../../components/ui';
import { MinePicker, MinesMap, LatLng } from '../../components/MineMap';

const headcount = (m: Mine) => Object.values(m.staff || {}).reduce((a, b) => a + (b || 0), 0);

export const MineEditor: React.FC<{ mine: Mine | null; onClose: () => void; onSaved: (m: Mine) => void }> = ({
  mine,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(mine?.name || '');
  const [code, setCode] = useState(mine?.code || '');
  const [locality, setLocality] = useState(mine?.locality || '');
  const [state, setState] = useState(mine?.state || '');
  const [point, setPoint] = useState<LatLng | null>(
    mine?.latitude != null && mine?.longitude != null ? { lat: mine.latitude, lng: mine.longitude } : null
  );
  const [radius, setRadius] = useState(mine?.radiusMeters || 500);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !state.trim()) {
      setError('Enter the mine name and state.');
      return;
    }
    if (!point) {
      setError('Place the mine on the map.');
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      name,
      code: code || undefined,
      locality,
      state,
      region: state,
      latitude: point.lat,
      longitude: point.lng,
      radiusMeters: radius,
    };
    try {
      onSaved(mine ? await api.updateMine(mine.id, body) : await api.createMine(body));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={mine ? `Edit ${mine.name}` : 'Add mine'} onClose={onClose} width="lg">
      <form onSubmit={save} className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Mine name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </Field>
          <Field label="Code (optional)">
            <input value={code} onChange={(e) => setCode(e.target.value)} className="input uppercase placeholder:normal-case" placeholder="Generated if empty" disabled={!!mine} />
          </Field>
          <Field label="Locality">
            <input value={locality} onChange={(e) => setLocality(e.target.value)} className="input" placeholder="Town or area" />
          </Field>
          <Field label="State">
            <input value={state} onChange={(e) => setState(e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Location">
          <MinePicker value={point} radius={radius} onChange={setPoint} onPlaceFound={(n) => !locality && setLocality(n)} />
        </Field>

        <Field label={`Attendance radius: ${radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}`}>
          <input
            type="range"
            min={100}
            max={5000}
            step={50}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-500">Workers can mark attendance only inside this circle.</p>
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : mine ? 'Save' : 'Add mine'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const AdminMinesPage: React.FC = () => {
  const navigate = useNavigate();
  const [mines, setMines] = useState<Mine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const load = () =>
    api
      .getMines()
      .then(setMines)
      .catch((e) => console.error('Error loading mines:', e))
      .finally(() => setIsLoading(false));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mines"
        description={isLoading ? undefined : `${mines.length} enrolled`}
        actions={
          <button onClick={() => setIsAdding(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add mine
          </button>
        }
      />

      {!isLoading && mines.length > 0 && <MinesMap mines={mines} onSelect={(id) => navigate(`/admin/mines/${id}`)} />}

      <div className="card divide-y divide-white/[0.05] stagger">
        {isLoading ? (
          <ListSkeleton />
        ) : mines.length === 0 ? (
          <Empty>No mines yet. Add the first one.</Empty>
        ) : (
          mines.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/admin/mines/${m.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-200 truncate">{m.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500 truncate">
                  {[m.locality, m.state].filter(Boolean).join(', ')} · {headcount(m)} {headcount(m) === 1 ? 'person' : 'people'}
                </p>
              </div>
              {m.latitude == null && <span className="text-xs text-amber-400">No location</span>}
            </button>
          ))
        )}
      </div>

      {isAdding && (
        <MineEditor
          mine={null}
          onClose={() => setIsAdding(false)}
          onSaved={(m) => {
            setIsAdding(false);
            navigate(`/admin/mines/${m.id}`);
          }}
        />
      )}
    </div>
  );
};
