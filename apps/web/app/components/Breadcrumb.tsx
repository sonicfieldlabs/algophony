import Link from "next/link";

type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`}>
            {item.href && !last ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
            {!last && <span className="breadcrumb-sep"> / </span>}
          </span>
        );
      })}
    </nav>
  );
}
