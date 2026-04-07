import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const C = {
  cream: "#FEF1DD",
  orange: "#FF4F14",
  orangeDark: "#E51E00",
  orangeHover: "#B61902",
  text: "#2F2B27",
  textSub: "rgba(47,43,39,0.54)",
  ring: "#e3c9a1",
};

function gradeOrder(g) {
  if (g === "K") return 0;
  const n = parseInt(g, 10);
  return isNaN(n) ? 999 : n;
}

function expandGrade(g) {
  if (g === "K") return ["K"];
  const parts = g.split("-").map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const result = [];
    for (let i = parts[0]; i <= parts[1]; i++) result.push(String(i));
    return result;
  }
  return [g];
}

function standardMatchesGrade(standard, selectedGrade) {
  if (selectedGrade === "all") return true;
  return expandGrade(standard.Grade).includes(selectedGrade);
}

function gradeLabel(g) {
  if (g === "K") return "K";
  return g;
}

function SyncIcon({ spinning }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className={spinning ? "animate-spin" : ""}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path
        d="M13.65 2.35A7.96 7.96 0 0 0 8 0C3.58 0 0 3.58 0 8h2a6 6 0 0 1 10.24-4.24L9 7h7V0l-2.35 2.35zM14 8a6 6 0 0 1-10.24 4.24L7 9H0v7l2.35-2.35A7.96 7.96 0 0 0 8 16c4.42 0 8-3.58 8-8h-2z"
        fill="currentColor"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EmptyState({ onSync, syncing }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
      <div
        className="bg-white rounded-3xl px-8 sm:px-10 py-12 text-center max-w-md w-full mx-4"
        style={{ boxShadow: `inset 0 0 0 1px ${C.ring}` }}
      >
        <div
          className="text-5xl mb-4 font-bold"
          style={{ fontFamily: "'Playpen Sans', cursive" }}
        >
          📚
        </div>
        <h2 className="text-xl font-extrabold mb-2" style={{ color: C.text }}>
          No Data Yet
        </h2>
        <p className="text-sm mb-6" style={{ color: C.textSub }}>
          Sync standards and games to get started.
        </p>
        <button
          onClick={onSync}
          disabled={syncing}
          className="inline-flex items-center justify-center gap-2 rounded-3xl font-extrabold uppercase px-6 py-3 text-base cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: C.cream,
            border: `3px solid ${C.orangeDark}`,
            color: C.orangeDark,
            fontFamily: "'Nunito', sans-serif",
            opacity: syncing ? 0.6 : 1,
          }}
        >
          <SyncIcon spinning={syncing} />
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
    </div>
  );
}

function extractHashId(url) {
  if (!url) return null;
  try {
    const parts = new URL(url).pathname.split("/");
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

const TOOL_LABELS = {
  "multiple-choice-v2": "Multiple Choice",
  "fill-in-the-blank": "Fill in the Blank",
  "memory-tiles": "Memory Tiles",
  matching: "Matching",
  sorting: "Sorting",
  sequencing: "Sequencing",
  flashcards: "Flashcards",
};

const gameDetailsCache = {};

function GameCard({ game }) {
  const hashId = extractHashId(game.URL || game["Game URL"]);
  const [details, setDetails] = useState(gameDetailsCache[hashId] || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hashId || details) return;
    if (gameDetailsCache[hashId]) {
      setDetails(gameDetailsCache[hashId]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/game-details?hashid=${encodeURIComponent(hashId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && !data.error) {
          gameDetailsCache[hashId] = data;
          setDetails(data);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hashId]);

  const pp = details?.pastPrompt;
  const thumbnailUrl = pp?.props?.ai_thumbnail || null;
  const title = pp?.prompt_output?.data?.title || null;
  const topic = pp?.prompt_input?.topic || null;
  const toolLabel = TOOL_LABELS[game.Tool] || game.Tool || "";

  const card = (
    <div
      className="w-44 sm:w-52 flex-shrink-0 rounded-3xl overflow-hidden bg-white transition-all duration-200"
      style={{ boxShadow: `inset 0 0 0 1px ${C.ring}` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full" style={{ aspectRatio: "16/10", backgroundColor: C.cream }}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {loading ? (
              <span className="animate-pulse text-xs" style={{ color: C.textSub }}>Loading…</span>
            ) : (
              <span className="text-2xl">🎮</span>
            )}
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        {toolLabel && (
          <span
            className="text-xs font-semibold whitespace-nowrap"
            style={{ color: C.textSub, fontFamily: "'Nunito', sans-serif" }}
          >
            {toolLabel}
          </span>
        )}
        <h4
          className="text-xs font-extrabold leading-snug line-clamp-2 mt-0.5"
          style={{ color: C.text, fontFamily: "'Nunito', sans-serif" }}
        >
          {title || game.Description || "Untitled game"}
        </h4>
        {topic && (
          <p
            className="text-[11px] leading-relaxed mt-0.5 line-clamp-2"
            style={{ color: C.textSub }}
            title={topic}
          >
            {topic}
          </p>
        )}
      </div>
    </div>
  );

  if (game.URL) {
    return (
      <a href={game.URL} target="_blank" rel="noopener noreferrer" className="no-underline">
        {card}
      </a>
    );
  }
  return card;
}

function StandardRow({ standard, games, expanded, onToggle }) {
  const code = standard["Standard Code"];
  const gameCount = games.length;

  return (
    <div
      className="bg-white rounded-3xl transition-all duration-200 cursor-pointer"
      style={{
        boxShadow: expanded
          ? `inset 0 0 0 2px ${C.orange}`
          : `inset 0 0 0 1px ${C.ring}`,
      }}
      onClick={onToggle}
    >
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs sm:text-sm font-extrabold whitespace-nowrap"
              style={{ color: C.orangeDark }}
            >
              {code}
            </span>
            {gameCount > 0 && (
              <span
                className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ backgroundColor: C.cream, color: C.orangeDark }}
              >
                {gameCount} {gameCount === 1 ? "game" : "games"}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm mt-1 leading-relaxed" style={{ color: C.text }}>
            {standard["Standard Description"]}
          </p>
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          className="flex-shrink-0 mt-1 transition-transform duration-200"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            color: C.textSub,
          }}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {expanded && gameCount > 0 && (
        <div
          className="px-4 sm:px-5 pb-4 flex gap-3 overflow-x-auto pt-4 -mx-px"
          style={{ borderTop: `1px solid ${C.ring}` }}
          onClick={(e) => e.stopPropagation()}
        >
          {games.map((game, i) => (
            <GameCard key={game.id || i} game={game} />
          ))}
        </div>
      )}

      {expanded && gameCount === 0 && (
        <div
          className="px-4 sm:px-5 pb-4 text-sm pt-4"
          style={{ borderTop: `1px solid ${C.ring}`, color: C.textSub }}
        >
          No games aligned to this standard yet.
        </div>
      )}
    </div>
  );
}

function domainId(name) {
  return `domain-${name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "")}`;
}

function clusterId(domainName, clusterName) {
  const d = domainName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
  const c = clusterName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
  return `cluster-${d}-${c}`;
}

function TabPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-extrabold uppercase rounded-3xl cursor-pointer transition-all duration-150 whitespace-nowrap"
      style={{
        backgroundColor: active ? C.orangeDark : "#fff",
        color: active ? "#fff" : C.text,
        boxShadow: active ? "none" : `inset 0 0 0 1px ${C.ring}`,
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {children}
    </button>
  );
}

function SidebarContent({ grouped, activeDomain, scrollTo, onNavClick }) {
  return (
    <div className="p-4">
      <nav className="space-y-0.5">
        {grouped.map((d) => (
          <div key={d.name}>
            <button
              onClick={() => { scrollTo(domainId(d.name)); onNavClick?.(); }}
              className="w-full text-left px-3 py-2 text-sm font-bold rounded-2xl transition-all duration-150 cursor-pointer leading-snug"
              style={{
                color: C.text,
                fontFamily: "'Nunito', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${C.ring}`;
                e.currentTarget.style.backgroundColor = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {d.name}
            </button>
            {activeDomain === domainId(d.name) && [...d.clusters.keys()].map((clusterName) => (
              <button
                key={clusterName}
                onClick={() => { scrollTo(clusterId(d.name, clusterName)); onNavClick?.(); }}
                className="w-full text-left pl-6 pr-3 py-1 text-xs rounded-2xl transition-all duration-150 cursor-pointer leading-snug"
                style={{
                  color: C.textSub,
                  fontFamily: "'Nunito', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = C.text;
                  e.currentTarget.style.backgroundColor = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = C.textSub;
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {clusterName}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const [standards, setStandards] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [subject, setSubject] = useState("all");
  const [grade, setGrade] = useState("all");
  const [expandedCode, setExpandedCode] = useState(null);
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      setStandards(data.standards || []);
      setGames(data.games || []);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setSyncMessage(`Synced ${result.standards} standards and ${result.games} games`);
        await fetchData();
      } else {
        setSyncMessage(`Sync failed: ${result.error}`);
      }
    } catch (err) {
      setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  }

  const gamesByStandard = useMemo(() => {
    const map = {};
    for (const game of games) {
      const code = game["Standard Code"];
      if (!code) continue;
      if (!map[code]) map[code] = [];
      map[code].push(game);
    }
    return map;
  }, [games]);

  const subjects = useMemo(
    () => [...new Set(standards.map((s) => s.Subject))].sort(),
    [standards],
  );

  useEffect(() => {
    if (subjects.length > 0 && (subject === "all" || !subjects.includes(subject))) {
      setSubject(subjects[0]);
    }
  }, [subjects]);

  const grades = useMemo(() => {
    const filtered = subject === "all"
      ? standards
      : standards.filter((s) => s.Subject === subject);
    const allGrades = new Set();
    for (const s of filtered) {
      for (const g of expandGrade(s.Grade)) allGrades.add(g);
    }
    return [...allGrades].sort((a, b) => gradeOrder(a) - gradeOrder(b));
  }, [standards, subject]);

  const subjectGradeFiltered = useMemo(() => {
    return standards.filter((s) => {
      if (subject !== "all" && s.Subject !== subject) return false;
      if (!standardMatchesGrade(s, grade)) return false;
      return true;
    });
  }, [standards, subject, grade]);

  const filteredStandards = useMemo(() => {
    const q = search.toLowerCase().trim();
    return subjectGradeFiltered.filter((s) => {
      if (q) {
        const haystack =
          `${s["Standard Code"]} ${s["Standard Description"]} ${s.Domain} ${s.Cluster}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [subjectGradeFiltered, search]);

  const grouped = useMemo(() => {
    const result = [];
    const domainMap = new Map();
    for (const s of filteredStandards) {
      if (!domainMap.has(s.Domain)) {
        const d = { name: s.Domain, clusters: new Map() };
        domainMap.set(s.Domain, d);
        result.push(d);
      }
      const d = domainMap.get(s.Domain);
      if (!d.clusters.has(s.Cluster)) {
        d.clusters.set(s.Cluster, []);
      }
      d.clusters.get(s.Cluster).push(s);
    }
    return result;
  }, [filteredStandards]);

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const root = mainRef.current;
    if (!root || grouped.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveDomain(entry.target.id);
            break;
          }
        }
      },
      { root, rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );

    const sections = root.querySelectorAll("[data-domain-section]");
    sections.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [grouped]);

  const hasData = standards.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.cream }}>
        <div className="text-base font-bold" style={{ color: C.textSub }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: C.cream }}>
      {/* Header */}
      <header
        className="flex items-center justify-between w-full px-4 sm:px-6 py-3 flex-shrink-0"
        style={{ backgroundColor: C.orange }}
      >
        <div className="flex items-center gap-3">
          {hasData && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-white cursor-pointer p-1"
            >
              <MenuIcon />
            </button>
          )}
          <h1
            className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-white"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            CCSS Game Browser
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {syncMessage && (
            <span className="text-xs font-semibold text-white/80 hidden sm:inline">{syncMessage}</span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 rounded-3xl font-extrabold uppercase px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm cursor-pointer transition-all duration-150"
            style={{
              backgroundColor: C.cream,
              border: `3px solid ${C.orangeDark}`,
              color: C.orangeDark,
              fontFamily: "'Nunito', sans-serif",
              opacity: syncing ? 0.7 : 1,
            }}
          >
            <SyncIcon spinning={syncing} />
            <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>
      </header>

      {/* Tab bar */}
      {hasData && (
        <div
          className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 overflow-x-auto"
          style={{ borderBottom: `1px solid ${C.ring}` }}
        >
          {subjects.map((s) => (
            <TabPill
              key={s}
              active={subject === s}
              onClick={() => { setSubject(s); setSearch(""); }}
            >
              {s}
            </TabPill>
          ))}

          <div className="w-px h-6 mx-1 flex-shrink-0" style={{ backgroundColor: C.ring }} />

          <TabPill active={grade === "all"} onClick={() => setGrade("all")}>
            All
          </TabPill>
          {grades.map((g) => (
            <TabPill key={g} active={grade === g} onClick={() => setGrade(g)}>
              {gradeLabel(g)}
            </TabPill>
          ))}

          <div className="w-px h-6 mx-1 flex-shrink-0" style={{ backgroundColor: C.ring }} />

          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-3xl px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold outline-none bg-white flex-shrink-0 w-36 sm:w-48"
            style={{
              boxShadow: `inset 0 0 0 1px ${C.ring}`,
              color: C.text,
              fontFamily: "'Nunito', sans-serif",
            }}
          />
        </div>
      )}

      {!hasData ? (
        <main className="flex-1 flex">
          <EmptyState onSync={handleSync} syncing={syncing} />
        </main>
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
              style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            />
          )}

          {/* Sidebar — always visible on md+, slide-over on mobile */}
          <aside
            className={`
              fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto transition-transform duration-200 ease-out
              md:static md:w-60 md:translate-x-0 md:z-auto
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
            style={{ backgroundColor: C.cream, borderRight: `1px solid ${C.ring}` }}
          >
            {/* Mobile close button */}
            <div className="flex items-center justify-between px-4 pt-4 md:hidden">
              <span className="text-sm font-extrabold uppercase" style={{ color: C.text, fontFamily: "'Nunito', sans-serif" }}>
                Navigate
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="cursor-pointer p-1"
                style={{ color: C.textSub }}
              >
                <CloseIcon />
              </button>
            </div>

            <SidebarContent
              grouped={grouped}
              activeDomain={activeDomain}
              scrollTo={scrollTo}
              onNavClick={() => setSidebarOpen(false)}
            />
          </aside>

          {/* Main content area */}
          <main ref={mainRef} className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-8 max-w-5xl">
              {grouped.length === 0 ? (
                <div
                  className="text-center py-16 text-sm font-semibold"
                  style={{ color: C.textSub }}
                >
                  No standards match your filters.
                </div>
              ) : (
                grouped.map((d) => (
                  <section
                    key={d.name}
                    id={domainId(d.name)}
                    data-domain-section
                    className="mb-8 sm:mb-10 scroll-mt-4"
                  >
                    <div
                      className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-3 sm:mb-4 pb-3"
                      style={{ borderBottom: `2px solid ${C.orange}` }}
                    >
                      <h2
                        className="text-sm sm:text-base font-extrabold uppercase tracking-wide"
                        style={{ color: C.text, fontFamily: "'Nunito', sans-serif" }}
                      >
                        {d.name}
                      </h2>
                      <span className="text-[10px] sm:text-xs font-bold" style={{ color: C.textSub }}>
                        {[...d.clusters.values()].reduce((n, arr) => n + arr.length, 0)} standards
                        {" · "}
                        {[...d.clusters.values()].reduce(
                          (n, arr) => n + arr.reduce((g, s) => g + (gamesByStandard[s["Standard Code"]] || []).length, 0), 0,
                        )} games
                      </span>
                    </div>

                    <div className="space-y-5 sm:space-y-6">
                      {[...d.clusters.entries()].map(([clusterName, clusterStandards]) => {
                        const clusterGameCount = clusterStandards.reduce(
                          (n, s) => n + (gamesByStandard[s["Standard Code"]] || []).length, 0,
                        );
                        return (
                        <div
                          key={clusterName}
                          id={clusterId(d.name, clusterName)}
                          className="scroll-mt-4"
                        >
                          <div className="flex items-baseline gap-2 mb-2 px-1">
                            <h3
                              className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide"
                              style={{ color: C.textSub }}
                            >
                              {clusterName}
                            </h3>
                            <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: C.textSub }}>
                              {clusterStandards.length}s · {clusterGameCount}g
                            </span>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {clusterStandards.map((s) => {
                              const code = s["Standard Code"];
                              const isExpanded = expandedCode === code;
                              return (
                                <div key={code} className={isExpanded ? "lg:col-span-2" : ""}>
                                  <StandardRow
                                    standard={s}
                                    games={gamesByStandard[code] || []}
                                    expanded={isExpanded}
                                    onToggle={() =>
                                      setExpandedCode(isExpanded ? null : code)
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
