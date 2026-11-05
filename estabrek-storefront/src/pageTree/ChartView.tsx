import { color } from "./css";
import styles from "./ChartView.module.css";

/** Manual data only: semantic values accompany every plotted shape. */
export function ChartView({ props, say, label }: { props: Record<string, unknown>; say: (value: unknown) => string; label: string }) {
  const data = (Array.isArray(props.items) ? props.items : []).slice(0, 24).flatMap((item: unknown) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return typeof row.value === "number" && Number.isFinite(row.value) && row.value >= 0 && row.value <= 1000000 ? [{ label: say(row.label).slice(0, 80), value: row.value, color: color(row.color) ?? "var(--accent,#86b696)" }] : [];
  });
  if (!data.length) return null;
  const maximum = Math.max(1, ...data.map(item => item.value));
  const sum = data.reduce((total, item) => total + item.value, 0);
  const showValues = props.showValues !== false;
  const kind = props.kind === "line" || props.kind === "donut" ? props.kind : "bar";
  let offset = 0;
  return <figure className={styles.chart} data-chart={kind} aria-label={label}>
    <figcaption>{label}</figcaption>
    {kind === "line" ? <svg viewBox="0 0 600 260" role="img" aria-label={label} className={styles.plot}>
      {[0, 1, 2, 3].map(index => <path key={index} d={`M24 ${24 + index * 64}H576`} stroke="currentColor" opacity=".12" />)}
      <polyline points={data.map((item, index) => `${24 + index * 552 / Math.max(1, data.length - 1)},${216 - item.value / maximum * 184}`).join(" ")} fill="none" stroke="var(--accent,#86b696)" strokeWidth="4" strokeLinejoin="round" />
      {data.map((item, index) => <circle key={index} cx={24 + index * 552 / Math.max(1, data.length - 1)} cy={216 - item.value / maximum * 184} r="6" fill={item.color}><title>{`${item.label}: ${item.value}`}</title></circle>)}
    </svg> : kind === "donut" ? <svg viewBox="0 0 260 260" role="img" aria-label={label} className={styles.donut}>
      <circle cx="130" cy="130" r="96" fill="none" stroke="currentColor" opacity=".1" strokeWidth="26" />
      {data.map((item, index) => {
        const percentage = sum > 0 ? item.value / sum * 100 : 0;
        const start = offset; offset += percentage;
        return <circle key={index} cx="130" cy="130" r="96" pathLength="100" fill="none" stroke={item.color} strokeWidth="26" strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={-start} transform="rotate(-90 130 130)"><title>{`${item.label}: ${item.value}`}</title></circle>;
      })}
      {showValues ? <text x="130" y="136" textAnchor="middle" fontSize="28" fill="currentColor">{sum.toLocaleString()}</text> : null}
    </svg> : null}
    <dl className={styles.values}>
      {data.map((item, index) => <div key={index} className={styles.row}>
        <dt><span style={{ background: item.color }} />{item.label}</dt>
        <dd>{kind === "bar" ? <span className={styles.track}><span style={{ width: `${item.value / maximum * 100}%`, background: item.color }} /></span> : null}{showValues ? <output>{item.value.toLocaleString()}</output> : <span className={styles.sr}>{item.value}</span>}</dd>
      </div>)}
    </dl>
  </figure>;
}
