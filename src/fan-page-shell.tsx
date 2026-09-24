import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PageMeta } from "./page-meta";

export function FanPageShell({ title, section, description, children }: {
  title: string; section: string; description: string; children: ReactNode;
}) {
  return <>
    <PageMeta title={title} description={description} />
    <main className="site-shell fan-page">
      <header className="subpage-header">
        <Link className="mini-wordmark" to="/" aria-label="스키마스위치 홈">
          <span><span className="wordmark-outline">S</span>UKIMA</span><span>SWITCH</span>
        </Link>
        <Link className="back-link" to="/">← HOME</Link>
      </header>
      <section className="guide-heading fan-heading">
        <p className="eyebrow">{section}</p><h1>{title}</h1>
        <p className="guide-note">{description}</p>
      </section>
      {children}
      <footer className="site-footer"><span>SUKIMA SWITCH UNOFFICIAL FAN SITE</span><Link to="/">HOME ↗</Link></footer>
    </main>
  </>;
}
