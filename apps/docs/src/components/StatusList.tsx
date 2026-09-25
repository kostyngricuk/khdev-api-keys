type Item = { label: string; color: string; text: string };

/** Colored status legend used in the docs (docs components live in the docs app). */
export default function StatusList({ items }: { items: Item[] }) {
  return (
    <ul style={{ listStyle: "none", paddingLeft: 0 }}>
      {items.map((item) => (
        <li key={item.label} style={{ marginBottom: 8 }}>
          <span className="status-dot" style={{ background: item.color }} />
          <strong>{item.label}</strong> — {item.text}
        </li>
      ))}
    </ul>
  );
}
