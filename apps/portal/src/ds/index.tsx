/* The design system's components. Each is a thin wrapper that sets a ds-* class and data-*
   variants; the look lives in components.css and the values in tokens.css. Pages build from
   these and never set a colour, size or radius of their own. Icons are lucide, 16px, stroke 1.5. */
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type HTMLAttributes } from 'react';
import './components.css';

export * as Icon from 'lucide-react';

export type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ---------------------------------------------------------------- Button */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: Size;
  /** A square button holding one icon. Give it an aria-label. */
  iconOnly?: boolean;
};
export function Button({ variant = 'secondary', size = 'md', iconOnly, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cx('ds-button', className)} data-variant={variant} data-size={size} data-icon-only={iconOnly || undefined} {...rest} />;
}

/** A link that looks like a button: for navigation, so a button never sits inside a link. */
export function LinkButton({ variant = 'secondary', size = 'md', className, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonProps['variant']; size?: Size }) {
  return <a className={cx('ds-button', className)} data-variant={variant} data-size={size} {...rest} />;
}

/* ----------------------------------------------------------- Badge, Dot, Kbd */
export function Badge({ tone = 'gray', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span className="ds-badge" data-tone={tone} title={title}>{children}</span>;
}
export function Dot({ tone = 'gray', title }: { tone?: Tone; title?: string }) {
  return <span className="ds-dot" data-tone={tone} title={title} aria-label={title} />;
}
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="ds-kbd">{children}</kbd>;
}

/* ----------------------------------------------------------------- Field */
type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  suffix?: ReactNode;
  fieldSize?: 'md' | 'lg';
  /** Gray fill instead of a border: form inputs on a card. */
  filled?: boolean;
  label?: string;
  inputRef?: React.Ref<HTMLInputElement>;
};
export function Field({ icon, suffix, fieldSize = 'lg', filled, label, className, id, inputRef, ...input }: FieldProps) {
  const field = (
    <div className={cx('ds-field', className)} data-size={fieldSize} data-filled={filled || undefined}>
      {icon}
      <input id={id} ref={inputRef} {...input} />
      {suffix}
    </div>
  );
  if (!label) return field;
  return (
    <label htmlFor={id} style={{ display: 'block', minWidth: 0 }}>
      <span className="ds-field-label">{label}</span>
      {field}
    </label>
  );
}

/* ------------------------------------------------------------------ Card */
type CardProps = HTMLAttributes<HTMLDivElement> & { padded?: boolean; interactive?: boolean; as?: 'div' | 'li' | 'section' };
export function Card({ padded, interactive, className, as: Tag = 'div', ...rest }: CardProps) {
  return <Tag className={cx('ds-card', className)} data-padded={padded || undefined} data-interactive={interactive || undefined} {...(rest as HTMLAttributes<HTMLElement>)} />;
}

/* ------------------------------------------------------------ EmptyState */
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ds-empty">
      {icon && <div className="ds-empty__icon">{icon}</div>}
      <div className="ds-empty__title">{title}</div>
      {children && <div className="ds-empty__text">{children}</div>}
      {action && <div className="ds-empty__action">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Avatar */
export const initials = (s: string) =>
  s.replace(/[^A-Za-z0-9 ._-]/g, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
export function Avatar({ name, shape = 'circle', size = 'md' }: { name: string; shape?: 'circle' | 'square'; size?: 'md' | 'lg' }) {
  return <span className="ds-avatar" data-shape={shape} data-size={size} aria-hidden="true">{initials(name)}</span>;
}

/* ------------------------------------------------------------------ Tabs */
export function Tabs<K extends string>({ items, value, onChange }: { items: { key: K; label: ReactNode }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="ds-tabs" role="tablist">
      {items.map((t) => (
        <button key={t.key} role="tab" className="ds-tab" aria-selected={t.key === value} onClick={() => onChange(t.key)}>{t.label}</button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Segmented */
export function Segmented<K extends string>({ items, value, onChange }: { items: { key: K; icon: ReactNode; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="ds-segmented" role="group">
      {items.map((t) => (
        <button key={t.key} aria-pressed={t.key === value} aria-label={t.label} title={t.label} onClick={() => onChange(t.key)}>{t.icon}</button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Menu */
/** A popover that closes on outside click and Escape. Position it with `style`. */
export function Menu({ open, onClose, children, style, className }: { open: boolean; onClose: () => void; children: ReactNode; style?: React.CSSProperties; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // Defer so the click that opened the menu does not close it.
    const t = setTimeout(() => document.addEventListener('mousedown', click));
    document.addEventListener('keydown', key);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open, onClose]);
  if (!open) return null;
  return <div ref={ref} className={cx('ds-menu', className)} style={style} role="menu">{children}</div>;
}
export function MenuItem({ children, onClick, active }: { children: ReactNode; onClick?: () => void; active?: boolean }) {
  return <button className="ds-menu__item" role="menuitem" data-active={active || undefined} onClick={onClick}>{children}</button>;
}

/* ---------------------------------------------------------------- Notice */
export function Notice({ tone = 'gray', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return <div className="ds-notice" data-tone={tone} role="status">{icon}<div>{children}</div></div>;
}

/* ------------------------------------------------------------ PageHeader */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ds-page-header">
      <div className="ds-page-header__text">
        <h1 className="ds-h1">{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions}
    </div>
  );
}
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="ds-section-title ds-label">{children}</h2>;
}

/* ---------------------------------------------------------------- Dialog */
export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ds-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ds-dialog__body">
          <h2 className="ds-h2">{title}</h2>
          {children}
        </div>
        {footer && <div className="ds-dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}
