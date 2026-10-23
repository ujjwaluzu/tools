"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type ToolGroup = {
  slug: string;
  name: string;
  description: string;
  tools: { title: string; href: string }[];
};

export function ToolsMegaMenu({ groups, brand, actions }: { groups: ToolGroup[]; brand: ReactNode; actions: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeGroup = groups.find((group) => group.slug === activeSlug) ?? groups[0];

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };
  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => setIsOpen(false), 260);
  };

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      cancelScheduledClose();
    };
  }, [isOpen]);

  const showGroup = (slug: string) => {
    setActiveSlug(slug);
    setIsOpen(true);
  };
  const toggleMobileMenu = () => {
    setActiveSlug(null);
    setIsOpen((open) => !open);
  };
  const close = () => setIsOpen(false);

  return (
    <div
      className={`tools-mega-menu${isOpen ? " is-open" : ""}`}
      ref={rootRef}
      onMouseEnter={cancelScheduledClose}
      onMouseLeave={scheduleClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <div className="header-inner">
        {brand}
        <nav className="tools-category-nav" aria-label="Tool categories">
          {groups.map((group) => (
            <button
              className={`tools-category-trigger${activeSlug === group.slug && isOpen ? " is-active" : ""}`}
              type="button"
              key={group.slug}
              aria-expanded={activeSlug === group.slug && isOpen}
              aria-controls="tools-mega-panel"
              onMouseEnter={() => showGroup(group.slug)}
              onFocus={() => showGroup(group.slug)}
              onClick={() => {
                if (window.matchMedia("(hover: none)").matches) {
                  if (isOpen && activeSlug === group.slug) close();
                  else showGroup(group.slug);
                } else showGroup(group.slug);
              }}
            >
              {group.name}
            </button>
          ))}
        </nav>
        <button className="tools-mobile-trigger" type="button" aria-expanded={isOpen} aria-controls="tools-mega-panel" onClick={toggleMobileMenu}>
          Tools <svg aria-hidden="true" viewBox="0 0 12 12"><path d="m2.5 4.5 3.5 3 3.5-3" /></svg>
        </button>
        {actions}
      </div>
      <div
        id="tools-mega-panel"
        className="tools-mega-panel"
        aria-label={activeSlug ? `${activeGroup.name} tools` : "All tools by category"}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="tools-mega-reveal">
          {activeSlug ? (
            <div className="tools-mega-content">
              <div className="tools-mega-intro">
                <span className="tools-mega-eyebrow">Browse category</span>
                <h2>{activeGroup.name}</h2>
                <p>{activeGroup.description}</p>
                <Link href={`/tools/${activeGroup.slug}`} className="tools-mega-all" onClick={close}>View category <span aria-hidden="true">↗</span></Link>
              </div>
              <nav className="tools-mega-links" aria-label={`${activeGroup.name} tools`}>
                {activeGroup.tools.map((tool, index) => (
                  <Link href={tool.href} key={tool.href} style={{ "--tool-index": index } as CSSProperties} onClick={close}>{tool.title}</Link>
                ))}
              </nav>
            </div>
          ) : (
            <div className="tools-all-groups">
              {groups.map((group) => (
                <section className="tools-all-group" key={group.slug}>
                  <Link href={`/tools/${group.slug}`} className="tools-all-group-title" onClick={close}>{group.name}<span>{String(group.tools.length).padStart(2, "0")}</span></Link>
                  {group.tools.map((tool) => <Link href={tool.href} key={tool.href} onClick={close}>{tool.title}</Link>)}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
