import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Edge, Placed } from '../model/graph';
import * as I from './Icons';

const ROLE_BADGE: Record<Placed['role'], string> = {
  fact: 'Fact',
  dimension: 'Dimension',
  calendar: 'Calendar',
  master: 'Master',
  reference: 'Reference',
};

const ROLE_ICON: Record<Placed['role'], (p: { size?: number }) => JSX.Element> = {
  fact: I.Fact,
  dimension: I.Dimension,
  calendar: I.Calendar,
  master: I.Database,
  reference: I.Dimension,
};

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;
const PAD = 48;
/** Fit stays inside this band: never so small a name is unreadable, never blown up past
    the size the cards were drawn at. Zooming by hand still reaches MIN_ZOOM..MAX_ZOOM. */
const MIN_FIT = 0.55;
const MAX_FIT = 1;

interface View { x: number; y: number; k: number }

/** A left-to-right bezier: out of the right port, into the left port. */
function path(a: Placed, b: Placed) {
  const x1 = a.x + a.w, y1 = a.y + a.h / 2;
  const x2 = b.x, y2 = b.y + b.h / 2;
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function Canvas({
  nodes,
  edges,
  selectedId,
  onSelect,
  banner,
}: {
  nodes: Placed[];
  edges: Edge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  banner: { text: string; action: string } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [panning, setPanning] = useState(false);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  // Once the reader moves the canvas themselves, stop re-framing it under them.
  const moved = useRef(false);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el || nodes.length === 0) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.w));
    const maxY = Math.max(...nodes.map((n) => n.y + n.h));
    const w = maxX - minX, h = maxY - minY;
    const box = el.getBoundingClientRect();
    const k = Math.max(
      MIN_FIT,
      Math.min(MAX_FIT, Math.min((box.width - PAD * 2) / w, (box.height - PAD * 2) / h))
    );
    moved.current = false;
    setView({
      k,
      x: (box.width - w * k) / 2 - minX * k,
      y: (box.height - h * k) / 2 - minY * k,
    });
  }, [nodes]);

  // Re-fit whenever the layer changes, so switching tabs always lands framed.
  useLayoutEffect(() => { fit(); }, [fit]);

  // Re-fit on resize too, but only while the reader has left the framing alone.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (!moved.current) fit(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // Wheel: pinch-zoom about the cursor, plain wheel scrolls the canvas.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = el.getBoundingClientRect();
      const px = e.clientX - box.left, py = e.clientY - box.top;
      moved.current = true;
      setView((v) => {
        if (e.ctrlKey || e.metaKey) {
          const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * Math.exp(-e.deltaY * 0.01)));
          return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
        }
        return { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    setPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 3) moved.current = true;
    setView((v) => ({ ...v, x: d.vx + (e.clientX - d.x), y: d.vy + (e.clientY - d.y) }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setPanning(false);
    // A press that never moved is a click on the background: clear the selection.
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 3) onSelect(null);
  };

  const zoom = (factor: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const px = box.width / 2, py = box.height / 2;
    moved.current = true;
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
      return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
    });
  };

  const at = new Map(nodes.map((n) => [n.id, n]));
  const touching = new Set(
    selectedId ? edges.filter((e) => e.from === selectedId || e.to === selectedId).flatMap((e) => [e.from, e.to]) : []
  );

  return (
    <div
      ref={ref}
      className="canvas"
      data-panning={panning}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {banner && (
        <div className="banner">
          <I.Warning size={15} />
          <span>{banner.text}</span>
          <span className="banner__spacer" />
          <button className="banner__btn">{banner.action}</button>
        </div>
      )}

      <div
        className="canvas__world"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
      >
        <svg className="canvas__edges" width="1" height="1">
          {edges.map((e) => {
            const a = at.get(e.from), b = at.get(e.to);
            if (!a || !b) return null;
            const lit = selectedId != null && (e.from === selectedId || e.to === selectedId);
            const dim = selectedId != null && !lit;
            return (
              <path
                key={e.id}
                d={path(a, b)}
                fill="none"
                stroke={lit ? 'var(--accent)' : e.status === 'proven' ? 'var(--text-muted)' : 'var(--border)'}
                strokeWidth={lit ? 2 : 1.5}
                strokeDasharray={e.status === 'inferred' ? '5 4' : undefined}
                opacity={dim ? 0.3 : 1}
              />
            );
          })}
        </svg>

        {nodes.map((n) => {
          const Icon = ROLE_ICON[n.role];
          const selected = n.id === selectedId;
          const dimmed = selectedId != null && !selected && !touching.has(n.id);
          return (
            <div
              key={n.id}
              className="node"
              data-role={n.role}
              data-selected={selected}
              data-dimmed={dimmed}
              style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
            >
              <span className="node__badge">
                <Icon size={12} />
                {ROLE_BADGE[n.role]}
              </span>
              <button
                className="node__card"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect(n.id)}
              >
                <span className="node__head">
                  <span className="node__chip"><Icon size={14} /></span>
                  <span className="node__title">{n.name}</span>
                </span>
                <span className="node__foot">
                  <span className="node__grain">{n.grain || 'grain not stated'}</span>
                  {!n.grain && <span className="node__warn"><I.Warning size={14} /></span>}
                </span>
              </button>
              <span className="node__port node__port--in" />
              <span className="node__port node__port--out" />
            </div>
          );
        })}
      </div>

      <div className="dock" onPointerDown={(e) => e.stopPropagation()}>
        <button className="icon-btn" onClick={() => zoom(1 / 1.2)} title="Zoom out"><I.ZoomOut size={15} /></button>
        <span className="dock__zoom">{Math.round(view.k * 100)}%</span>
        <button className="icon-btn" onClick={() => zoom(1.2)} title="Zoom in"><I.ZoomIn size={15} /></button>
        <span className="dock__sep" />
        <button className="icon-btn" title="Pan the canvas"><I.Hand size={15} /></button>
        <button className="icon-btn" data-on="true" title="Select a table"><I.Cursor size={15} /></button>
        <span className="dock__sep" />
        <button className="dock__btn" onClick={fit}><I.Fit size={14} />Fit view</button>
      </div>

      <div className="legend" onPointerDown={(e) => e.stopPropagation()}>
        <span className="legend__row"><span className="legend__line" data-status="proven" />Proven by a data engineer</span>
        <span className="legend__row"><span className="legend__line" data-status="declared" />Declared, not proven</span>
        <span className="legend__row"><span className="legend__line" data-status="inferred" />Joinable, inferred</span>
      </div>
    </div>
  );
}
