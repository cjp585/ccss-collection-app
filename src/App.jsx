import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const C = {
  cream: "#FEF1DD",
  accent: "#ff3f22",
  accentDark: "#db1d00",
  accentDarker: "#e51e00",
  text: "#111",
  textSecondary: "rgba(0,0,0,0.54)",
  textTertiary: "rgba(0,0,0,0.38)",
  textFaint: "rgba(29,29,29,0.2)",
  ring: "#e3c9a1",
  standardBg: "#FDE7C4",
  darkChiclet: "#291a03",
  cardTitle: "#242527",
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
  if (g === "all") return "All";
  const n = parseInt(g, 10);
  if (isNaN(n)) return g;
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

function getDomainCode(standards) {
  if (!standards || standards.length === 0) return "";
  const code = standards[0]["Standard Code"];
  if (!code) return "";
  const lastDot = code.lastIndexOf(".");
  return lastDot > 0 ? code.substring(0, lastDot) : code;
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

function GameControllerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 6H3a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h18a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3zM7 14H6v1H5v-1H4v-1h1v-1h1v1h1v1zm8 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
    </svg>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
        <div className="text-5xl mb-4 font-bold" style={{ fontFamily: "'Playpen Sans', cursive" }}>
          📚
        </div>
        <h2 className="text-xl font-extrabold mb-2" style={{ color: C.text }}>
          No Data Yet
        </h2>
        <p className="text-sm mb-6" style={{ color: C.textSecondary }}>
          Sync standards and games to get started.
        </p>
        <button
          onClick={onSync}
          disabled={syncing}
          className="inline-flex items-center justify-center gap-2 rounded-3xl font-extrabold uppercase px-6 py-3 text-base cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: C.cream,
            border: `3px solid ${C.accentDark}`,
            color: C.accentDark,
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

const CACHE_KEY = "ccss-game-details";
const CACHE_VERSION = 1;

function loadCacheFromStorage() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed._v !== CACHE_VERSION) return {};
    delete parsed._v;
    return parsed;
  } catch {
    return {};
  }
}

let savePending = false;
function saveCacheToStorage() {
  if (savePending) return;
  savePending = true;
  requestIdleCallback(() => {
    savePending = false;
    try {
      const toSave = { ...gameDetailsCache, _v: CACHE_VERSION };
      localStorage.setItem(CACHE_KEY, JSON.stringify(toSave));
    } catch { /* storage full — ignore */ }
  });
}

const gameDetailsCache = loadCacheFromStorage();
const fetchQueue = [];
let activeFetches = 0;
const MAX_CONCURRENT = 6;
let detailsListeners = new Set();

function notifyDetailsListeners() {
  detailsListeners.forEach((fn) => fn());
}

function processQueue() {
  while (activeFetches < MAX_CONCURRENT && fetchQueue.length > 0) {
    const { hashId, resolve } = fetchQueue.shift();
    activeFetches++;
    fetch(`/api/game-details?hashid=${encodeURIComponent(hashId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          gameDetailsCache[hashId] = data;
          saveCacheToStorage();
          notifyDetailsListeners();
        }
        resolve(data.error ? null : data);
      })
      .catch(() => resolve(null))
      .finally(() => {
        activeFetches--;
        processQueue();
      });
  }
}

function queueFetch(hashId) {
  if (gameDetailsCache[hashId]) return Promise.resolve(gameDetailsCache[hashId]);
  return new Promise((resolve) => {
    fetchQueue.push({ hashId, resolve });
    processQueue();
  });
}

function useGameDetails(hashId) {
  const [details, setDetails] = useState(gameDetailsCache[hashId] || null);

  useEffect(() => {
    function check() {
      if (hashId && gameDetailsCache[hashId] && !details) {
        setDetails(gameDetailsCache[hashId]);
      }
    }
    check();
    detailsListeners.add(check);
    return () => detailsListeners.delete(check);
  }, [hashId, details]);

  return details;
}

function GameCard({ game, thumbnailMode }) {
  const hashId = extractHashId(game.URL || game["Game URL"]);
  const gameUrl = game.URL || game["Game URL"];
  const details = useGameDetails(hashId);
  const [imgError, setImgError] = useState(false);

  const pp = details?.pastPrompt;
  const aiThumbnail = pp?.props?.ai_thumbnail || null;
  const fallbackThumbnail = gameUrl ? `${gameUrl.replace(/\/+$/, "")}/thumbnail` : null;
  const thumbnailUrl = imgError
    ? null
    : thumbnailMode === "ai"
      ? (aiThumbnail || (details ? fallbackThumbnail : null))
      : (fallbackThumbnail || aiThumbnail);
  const title = pp?.prompt_output?.data?.title || null;
  const topic = pp?.prompt_input?.topic || null;
  const toolLabel = TOOL_LABELS[game.Tool] || game.Tool || "";

  const card = (
    <div className="w-[160px] sm:w-[220px] flex-shrink-0 flex flex-col gap-1">
      <div
        className="relative w-full h-[107px] sm:h-[146px] rounded-lg overflow-hidden"
        style={{ backgroundColor: C.cream }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {!details ? (
              <span className="animate-pulse text-xs" style={{ color: C.textSecondary }}>
                Loading…
              </span>
            ) : (
              <span className="text-2xl">🎮</span>
            )}
          </div>
        )}
        {toolLabel && (
          <span
            className="absolute top-1 left-1 inline-flex items-center rounded"
            style={{
              backgroundColor: C.darkChiclet,
              padding: "2px 5px",
              fontSize: "12px",
              fontWeight: 800,
              fontFamily: "'Nunito', sans-serif",
              color: C.cream,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {toolLabel}
          </span>
        )}
      </div>
      <div className="px-0.5 py-0.5">
        <p
          className="font-bold text-sm leading-4 line-clamp-1"
          style={{
            color: C.cardTitle,
            fontFamily: "'Nunito', sans-serif",
            letterSpacing: "0.14px",
          }}
        >
          {title || game.Description || "Untitled game"}
        </p>
        {topic && (
          <p
            className="font-normal text-xs leading-[13px] mt-0.5 line-clamp-2"
            style={{ color: C.textSecondary, fontFamily: "'Nunito', sans-serif" }}
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

function ScrollArrow({ direction, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-full flex items-center justify-center border-none shrink-0 transition-colors"
      style={{
        backgroundColor: "transparent",
        color: disabled ? "rgba(0,0,0,0.15)" : C.textSecondary,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
        <path
          d={direction === "left" ? "M12.5 15L7.5 10L12.5 5" : "M7.5 5L12.5 10L7.5 15"}
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function StandardCard({ standard, games, thumbnailMode }) {
  const code = standard["Standard Code"];
  const gameCount = games.length;
  const scrollRef = useRef(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScroll({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, games]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  return (
    <div className="rounded-2xl p-3 sm:p-4 relative" style={{ backgroundColor: C.standardBg }}>
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-block rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap shrink-0"
          style={{
            backgroundColor: C.accent,
            color: "white",
            fontFamily: "'Nunito', sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          {code}
        </span>
        {gameCount > 1 && (
          <div className="flex gap-1 shrink-0">
            <ScrollArrow direction="left" onClick={() => scroll("left")} disabled={!canScroll.left} />
            <ScrollArrow direction="right" onClick={() => scroll("right")} disabled={!canScroll.right} />
          </div>
        )}
      </div>
      <p
        className="font-semibold text-sm sm:text-base leading-[18px]"
        style={{
          color: C.textSecondary,
          fontFamily: "'Nunito', sans-serif",
          paddingLeft: "2px",
        }}
      >
        {standard["Standard Description"]}
      </p>
      {gameCount > 0 && (
        <div ref={scrollRef} className="flex gap-2 mt-2 sm:mt-2.5 overflow-x-auto pb-1">
          {games.map((game, i) => (
            <GameCard key={game.id || i} game={game} thumbnailMode={thumbnailMode} />
          ))}
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

function SidebarContent({ grouped, activeDomain, activeCluster, scrollTo, onNavClick }) {
  return (
    <div className="flex flex-col gap-1 p-4">
      {grouped.map((d) => {
        const isActive = activeDomain === domainId(d.name);
        const allStandards = [...d.clusters.values()].flat();
        const domainCode = getDomainCode(allStandards);

        return (
          <div key={d.name} className="flex flex-col">
            <button
              onClick={() => {
                scrollTo(domainId(d.name));
                onNavClick?.();
              }}
              className="text-left flex items-center gap-2.5 py-2 cursor-pointer bg-transparent border-none"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isActive ? C.accent : C.textTertiary }}
              />
              <span
                className="text-sm font-bold leading-5 flex-1"
                style={{
                  color: isActive ? C.accent : C.text,
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {d.name}
              </span>
              <span
                className="text-xs font-mono shrink-0"
                style={{ color: C.textTertiary }}
              >
                {domainCode}
              </span>
            </button>
            {isActive && (
              <div className="flex flex-col ml-[18px] mb-1">
                {[...d.clusters.keys()].map((clusterName) => {
                  const isClusterActive = activeCluster === clusterId(d.name, clusterName);
                  return (
                    <button
                      key={clusterName}
                      onClick={() => {
                        scrollTo(clusterId(d.name, clusterName));
                        onNavClick?.();
                      }}
                      className="text-left flex items-center gap-2 py-1.5 cursor-pointer bg-transparent border-none"
                    >
                      <div
                        className="w-0.5 self-stretch rounded-full shrink-0"
                        style={{ backgroundColor: isClusterActive ? C.accent : "rgba(0,0,0,0.15)" }}
                      />
                      <span
                        className="text-sm leading-4"
                        style={{
                          color: isClusterActive ? C.text : C.textSecondary,
                          fontWeight: isClusterActive ? 700 : 500,
                          fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        {clusterName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GradePickerBody({ subjects, standards, onSelect }) {
  const gradesBySubject = useMemo(() => {
    const map = {};
    for (const subj of subjects) {
      const filtered = standards.filter((s) => s.Subject === subj);
      const allGrades = new Set();
      for (const s of filtered) {
        for (const g of expandGrade(s.Grade)) allGrades.add(g);
      }
      map[subj] = [...allGrades].sort((a, b) => gradeOrder(a) - gradeOrder(b));
    }
    return map;
  }, [subjects, standards]);

  function gradeLong(g) {
    if (g === "K") return "Kindergarten";
    const n = parseInt(g, 10);
    if (isNaN(n)) return g;
    return `Grade ${n}`;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 sm:px-8 py-6 sm:py-10 max-w-4xl mx-auto w-full">
        <p
          className="text-sm font-medium mb-6"
          style={{ color: C.textSecondary, fontFamily: "'Nunito', sans-serif" }}
        >
          Choose a subject and grade to get started
        </p>
        {subjects.map((subj) => (
          <div key={subj} className="mb-8 sm:mb-10">
            <h2
              className="text-xl sm:text-2xl font-extrabold mb-4"
              style={{ color: C.text, fontFamily: "'Nunito', sans-serif" }}
            >
              {subj}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
              {(gradesBySubject[subj] || []).map((g) => (
                <button
                  key={g}
                  onClick={() => onSelect(subj, g)}
                  className="rounded-xl py-3 sm:py-4 px-4 text-sm sm:text-base font-bold cursor-pointer border-2 transition-all duration-150"
                  style={{
                    backgroundColor: "white",
                    borderColor: C.ring,
                    color: C.text,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.accent;
                    e.currentTarget.style.backgroundColor = "#FFF5F3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.ring;
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  {gradeLong(g)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
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
  const [grade, setGrade] = useState("K");
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState(null);
  const [activeCluster, setActiveCluster] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [thumbnailMode, setThumbnailMode] = useState("ai");
  const [showLanding, setShowLanding] = useState(true);
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

  useEffect(() => {
    fetchData();
  }, []);

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
    if (!showLanding && subjects.length > 0 && (subject === "all" || !subjects.includes(subject))) {
      setSubject(subjects[0]);
    }
  }, [subjects, showLanding]);

  const grades = useMemo(() => {
    const filtered =
      subject === "all" ? standards : standards.filter((s) => s.Subject === subject);
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
    return subjectGradeFiltered;
  }, [subjectGradeFiltered]);

  const searchActive = committedSearch.trim().length > 0;

  const searchResults = useMemo(() => {
    const q = committedSearch.toLowerCase().trim();
    if (!q) return [];
    return standards.filter((s) => {
      const haystack =
        `${s["Standard Code"]} ${s["Standard Description"]} ${s.Domain} ${s.Cluster} ${s.Subject}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [standards, committedSearch]);

  const searchGrouped = useMemo(() => {
    if (!searchActive) return [];
    const result = [];
    const domainMap = new Map();
    for (const s of searchResults) {
      const key = `${s.Subject} — ${s.Domain}`;
      if (!domainMap.has(key)) {
        const d = { name: s.Domain, subject: s.Subject, label: key, clusters: new Map() };
        domainMap.set(key, d);
        result.push(d);
      }
      const d = domainMap.get(key);
      if (!d.clusters.has(s.Cluster)) {
        d.clusters.set(s.Cluster, []);
      }
      d.clusters.get(s.Cluster).push(s);
    }
    return result;
  }, [searchResults, searchActive]);

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

  useEffect(() => {
    const visibleStandards = searchActive ? searchResults : filteredStandards;
    const codes = new Set(visibleStandards.map((s) => s["Standard Code"]));
    for (const game of games) {
      const code = game["Standard Code"];
      if (!code || !codes.has(code)) continue;
      const hashId = extractHashId(game.URL || game["Game URL"]);
      if (hashId) queueFetch(hashId);
    }
  }, [filteredStandards, searchResults, searchActive, games]);

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

    const clusterObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCluster(entry.target.id);
            break;
          }
        }
      },
      { root, rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );

    const clusterEls = root.querySelectorAll("[id^='cluster-']");
    clusterEls.forEach((el) => clusterObserver.observe(el));

    return () => {
      observer.disconnect();
      clusterObserver.disconnect();
    };
  }, [grouped]);

  const hasData = standards.length > 0;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: C.cream }}
      >
        <div className="text-base font-bold" style={{ color: C.textSecondary }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: C.cream }}>
      {/* Header — ARCADE branding + search + controls */}
      <header
        className="flex items-center gap-3 px-3 sm:px-5 py-2 sm:py-2.5 flex-shrink-0"
        style={{ backgroundColor: C.accent }}
      >
        <div className="flex items-center shrink-0">
          <span
            className="text-white text-xl"
            style={{
              fontFamily: "'Titan One', cursive",
              textShadow: "1px 1px 0 rgba(0,0,0,0.3)",
            }}
          >
            ARCADE
          </span>
        </div>

        <div
          className="flex-1 flex items-center rounded-full px-4 min-w-0"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", height: "40px" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search all standards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setCommittedSearch(search.trim()); }}
            className="search-input flex-1 ml-2.5 text-base font-semibold outline-none border-none bg-transparent min-w-0"
            style={{
              color: "white",
              fontFamily: "'Nunito', sans-serif",
              letterSpacing: "0.2px",
            }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setCommittedSearch(""); }}
              className="shrink-0 bg-transparent border-none cursor-pointer p-0 ml-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <CloseIcon />
            </button>
          )}
          {search && (
            <button
              onClick={() => setCommittedSearch(search.trim())}
              className="shrink-0 bg-transparent border-none cursor-pointer p-0 ml-1"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {syncMessage && (
            <span className="text-xs font-semibold text-white/80 hidden sm:inline">
              {syncMessage}
            </span>
          )}
          <div
            className="hidden sm:flex rounded-full overflow-hidden"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", fontFamily: "'Nunito', sans-serif" }}
          >
            {[{ key: "ai", label: "AI" }, { key: "default", label: "Thumbnail" }].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setThumbnailMode(opt.key)}
                className="px-3 py-1.5 text-xs font-bold cursor-pointer border-none transition-colors"
                style={{
                  backgroundColor: thumbnailMode === opt.key ? "white" : "transparent",
                  color: thumbnailMode === opt.key ? C.accentDark : "rgba(255,255,255,0.8)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-white/80 hover:text-white cursor-pointer p-1 bg-transparent border-none transition-colors"
            title={syncing ? "Syncing..." : "Sync data"}
          >
            <SyncIcon spinning={syncing} />
          </button>
          <div className="hidden sm:block w-10 h-10 rounded-full bg-white/20 shrink-0" />
        </div>
      </header>

      {/* Title bar — Common Core Collection + breadcrumb dropdowns */}
      <div
        className="flex items-center flex-shrink-0"
        style={{ backgroundColor: C.accent, padding: "8px 20px 8px 12px" }}
      >
        <div className="flex items-center gap-1 sm:gap-2 mr-1 shrink-0">
          {hasData && !showLanding && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-white cursor-pointer p-1 bg-transparent border-none"
            >
              <MenuIcon />
            </button>
          )}
          <button
            onClick={() => { setShowLanding(true); setSearch(""); setCommittedSearch(""); }}
            className="bg-transparent border-none cursor-pointer p-0 flex items-center gap-1 sm:gap-2"
          >
            <span
              className="text-white text-base sm:text-2xl font-black leading-5 sm:leading-7 whitespace-nowrap"
              style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "0.4px" }}
            >
              Common Core
            </span>
            <span
              className="text-white text-base sm:text-2xl font-normal leading-5 sm:leading-7 whitespace-nowrap"
              style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "0.4px" }}
            >
              Collection
            </span>
          </button>
        </div>
        {hasData && !showLanding && (
          <div className="flex items-baseline gap-1 sm:gap-1.5 ml-1 sm:ml-2">
            <span
              className="text-sm sm:text-lg font-light select-none"
              style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Nunito', sans-serif" }}
            >/</span>
            <div className="flex items-center rounded-lg px-1.5 sm:px-2 py-0.5 transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
            >
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setSearch("");
                }}
                className="bg-transparent font-extrabold text-sm sm:text-lg outline-none cursor-pointer border-none p-0"
                style={{
                  color: "white",
                  fontFamily: "'Nunito', sans-serif",
                  appearance: "none",
                  WebkitAppearance: "none",
                  backgroundImage: "none",
                  paddingRight: 0,
                }}
              >
                {subjects.map((s) => (
                  <option key={s} value={s} style={{ color: C.text }}>{s}</option>
                ))}
              </select>
              <ChevronDownIcon className="shrink-0 w-3 h-3 sm:w-4 sm:h-4 ml-0.5" style={{ color: "white" }} />
            </div>
            <span
              className="text-sm sm:text-lg font-light select-none"
              style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Nunito', sans-serif" }}
            >/</span>
            <div className="flex items-center rounded-lg px-1.5 sm:px-2 py-0.5 transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
            >
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="bg-transparent font-extrabold text-sm sm:text-lg outline-none cursor-pointer border-none p-0"
                style={{
                  color: "white",
                  fontFamily: "'Nunito', sans-serif",
                  appearance: "none",
                  WebkitAppearance: "none",
                  backgroundImage: "none",
                  paddingRight: 0,
                }}
              >
                {grades.map((g) => (
                  <option key={g} value={g} style={{ color: C.text }}>{gradeLabel(g)}</option>
                ))}
              </select>
              <ChevronDownIcon className="shrink-0 w-3 h-3 sm:w-4 sm:h-4 ml-0.5" style={{ color: "white" }} />
            </div>
          </div>
        )}
      </div>


      {/* Content area */}
      {!hasData ? (
        <main className="flex-1 flex">
          <EmptyState onSync={handleSync} syncing={syncing} />
        </main>
      ) : searchActive ? (
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-8 py-4 sm:py-6 max-w-5xl">
            <p
              className="text-xs font-semibold mb-4"
              style={{ color: C.textSecondary, fontFamily: "'Nunito', sans-serif" }}
            >
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{committedSearch}"
            </p>
            {searchGrouped.length === 0 ? (
              <div
                className="text-center py-16 text-sm font-semibold"
                style={{ color: C.textSecondary }}
              >
                No standards match your search.
              </div>
            ) : (
              searchGrouped.map((d) => (
                <div key={d.label} className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className="text-xs font-bold uppercase tracking-wide"
                      style={{ color: C.accent, fontFamily: "'Nunito', sans-serif" }}
                    >
                      {d.subject}
                    </span>
                    <span className="text-lg font-bold" style={{ color: C.text, fontFamily: "'Nunito', sans-serif" }}>
                      {d.name}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[...d.clusters.entries()].map(([clusterName, clusterStandards]) => (
                      <div key={clusterName} className="flex flex-col gap-2">
                        <h4
                          className="font-bold text-sm leading-5"
                          style={{ color: C.textSecondary, fontFamily: "'Nunito', sans-serif" }}
                        >
                          {clusterName}
                        </h4>
                        {clusterStandards.map((s) => (
                          <StandardCard
                            key={s["Standard Code"]}
                            standard={s}
                            games={gamesByStandard[s["Standard Code"]] || []}
                            thumbnailMode={thumbnailMode}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      ) : showLanding ? (
        <GradePickerBody
          subjects={subjects}
          standards={standards}
          onSelect={(subj, g) => {
            setSubject(subj);
            setGrade(g);
            setShowLanding(false);
          }}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
              style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            />
          )}

          <aside
            className={`
              fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto transition-transform duration-200 ease-out
              md:static md:w-[300px] md:translate-x-0 md:z-auto md:shrink-0
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
            style={{ backgroundColor: C.cream, borderRight: `1px solid ${C.ring}` }}
          >
            <div className="flex items-center justify-between px-4 pt-4 md:hidden">
              <span
                className="text-sm font-extrabold uppercase"
                style={{ color: C.text, fontFamily: "'Nunito', sans-serif" }}
              >
                Navigate
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="cursor-pointer p-1 bg-transparent border-none"
                style={{ color: C.textSecondary }}
              >
                <CloseIcon />
              </button>
            </div>
            <SidebarContent
              grouped={grouped}
              activeDomain={activeDomain}
              activeCluster={activeCluster}
              scrollTo={scrollTo}
              onNavClick={() => setSidebarOpen(false)}
            />
          </aside>

          <main ref={mainRef} className="flex-1 overflow-y-auto">
            <div>
              {grouped.length === 0 ? (
                <div
                  className="text-center py-16 text-sm font-semibold"
                  style={{ color: C.textSecondary }}
                >
                  No standards match your filters.
                </div>
              ) : (
                grouped.map((d) => {
                  const allDomainStandards = [...d.clusters.values()].flat();
                  const totalStandards = allDomainStandards.length;
                  const totalGames = allDomainStandards.reduce(
                    (n, s) => n + (gamesByStandard[s["Standard Code"]] || []).length,
                    0,
                  );
                  const totalClusters = d.clusters.size;

                  return (
                    <section
                      key={d.name}
                      id={domainId(d.name)}
                      data-domain-section
                      className="scroll-mt-4"
                    >
                      {/* Domain title */}
                      <div className="px-4 sm:px-6 py-3 sm:py-4" style={{ backgroundColor: C.cream }}>
                        <h2
                          className="text-xl sm:text-[32px] font-bold leading-tight sm:leading-[48px]"
                          style={{ color: C.text, fontFamily: "'Nunito', sans-serif" }}
                        >
                          {d.name}
                        </h2>
                        <div
                          className="flex items-center gap-1 px-0.5 sm:px-1 -mt-0.5 text-xs sm:text-sm"
                          style={{
                            fontFamily: "'Nunito', sans-serif",
                            letterSpacing: "0.14px",
                          }}
                        >
                          <span className="font-semibold" style={{ color: C.textSecondary }}>
                            {totalClusters} cluster{totalClusters !== 1 ? "s" : ""}
                          </span>
                          <span className="font-light mx-0.5" style={{ color: C.textFaint }}>
                            |
                          </span>
                          <span className="font-semibold" style={{ color: C.textSecondary }}>
                            {totalStandards} standard{totalStandards !== 1 ? "s" : ""}
                          </span>
                          <span className="font-light mx-0.5" style={{ color: C.textFaint }}>
                            |
                          </span>
                          <span className="font-semibold" style={{ color: C.textSecondary }}>
                            {totalGames} game{totalGames !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Clusters */}
                      <div className="flex flex-col gap-4 sm:gap-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        {[...d.clusters.entries()].map(
                          ([clusterName, clusterStandards]) => (
                            <div
                              key={clusterName}
                              id={clusterId(d.name, clusterName)}
                              className="flex flex-col gap-2.5 sm:gap-3 scroll-mt-4"
                            >
                              <h3
                                className="font-bold text-sm sm:text-base leading-5"
                                style={{
                                  color: C.text,
                                  fontFamily: "'Nunito', sans-serif",
                                }}
                              >
                                {clusterName}
                              </h3>

                              {clusterStandards.map((s) => (
                                <StandardCard
                                  key={s["Standard Code"]}
                                  standard={s}
                                  games={
                                    gamesByStandard[s["Standard Code"]] || []
                                  }
                                  thumbnailMode={thumbnailMode}
                                />
                              ))}
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
