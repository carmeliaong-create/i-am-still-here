"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import posts from "./posts.json";
import videoArchive from "./videos.json";
import noteArchive from "./notes.json";

type Post = { date: string; url: string; title: string; text: string };
type WindowName = "diary" | "notes" | "photos" | "tv" | "about" | "archive" | "internet" | "trash";
type VideoEntry = { channel: number; name: string; date: string; label: string; duration: number; src: string };

const entries = posts as Post[];
const notes = noteArchive as Post[];
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const videos = (videoArchive as VideoEntry[])
  .toSorted((a, b) => a.date.localeCompare(b.date))
  .map((video, index) => ({ ...video, channel: index + 1, src: `${basePath}${video.src}` }));
const photos1998 = [1,2,4,5,6,7,9,10,13,19,20,21,22,24,25,26,27,28,29,30,31,32,33,34,35,36]
  .map((number) => `${basePath}/photos/1998/0000588400${String(number).padStart(2, "0")}.jpg`);
const clippyQuestions = [
  "Are you living, or producing evidence that you did?",
  "Is this memory, or merely storage?",
  "If nothing sticks, did it happen?",
  "Are you present, or only documented?",
  "How much of you is repetition?",
  "Which apology changed the pattern?",
  "What have you mistaken for permanence?",
  "Does the record remember you correctly?",
  "What remains when sincerity changes nothing?",
  "Would you recognize yourself without the archive?",
];
const icons: { id: WindowName; glyph: string; label: string }[] = [
  { id: "photos", glyph: "\u{1F4F7}", label: "1998" },
  { id: "notes", glyph: "\u{1F5D2}\uFE0F", label: "Notes" },
  { id: "diary", glyph: "📁", label: "Diary (2014–2025)" },
  { id: "tv", glyph: "📺", label: "Home Videos" },
  { id: "about", glyph: "🖥️", label: "My Computer" },
  { id: "archive", glyph: "📚", label: "Archive" },
  { id: "internet", glyph: "🌐", label: "The Internet" },
  { id: "trash", glyph: "🗑️", label: "Recycle Bin" },
];

function postName(post: Post) {
  const fallback = post.text.split(/\n/)[0].trim();
  return (post.title || fallback || "untitled").slice(0, 76);
}

export default function Home() {
  const [open, setOpen] = useState<WindowName[]>(["tv"]);
  const [active, setActive] = useState<WindowName>("tv");
  const [selected, setSelected] = useState<Post>(entries[0]);
  const [postOpen, setPostOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [start, setStart] = useState(false);
  const [sound, setSound] = useState(true);
  const [backgroundVolume, setBackgroundVolume] = useState(.28);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [channel, setChannel] = useState(0);
  const [staticOn, setStaticOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [volume, setVolume] = useState(.65);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [clippyVisible, setClippyVisible] = useState(true);
  const [clippyQuestion, setClippyQuestion] = useState(0);
  const years = useMemo(() => [...new Set(entries.map((p) => p.date.slice(-4)))], []);
  const filtered = useMemo(() => entries.filter((p) => {
    const matchesYear = year === "all" || p.date.endsWith(year);
    const haystack = `${p.date} ${postName(p)} ${p.text}`.toLowerCase();
    return matchesYear && haystack.includes(query.toLowerCase());
  }), [query, year]);

  useEffect(() => {
    if (open.length === 0) setClippyVisible(true);
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setClippyQuestion((current) => (current + 1 + Math.floor(Math.random() * (clippyQuestions.length - 1))) % clippyQuestions.length);
        setClippyVisible(true);
        schedule();
      }, 45000 + Math.random() * 45000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [open.length]);

  const show = (id: WindowName) => {
    setOpen((old) => old.includes(id) ? old : [...old, id]);
    setActive(id);
    setStart(false);
  };
  const close = (id: WindowName) => setOpen((old) => old.filter((x) => x !== id));
  const tone = (frequency: number, startAt: number, duration: number, volume = .035, type: OscillatorType = "square") => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + .008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + .02);
  };
  const playSound = (kind: "key" | "error" | "startup" | "static" | "play", force = false) => {
    if (!sound && !force) return;
    if (!audioRef.current) audioRef.current = new AudioContext();
    const ctx = audioRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === "key") {
      tone(880, now, .055, .018);
      tone(1320, now + .018, .045, .012);
    } else if (kind === "error") {
      tone(196, now, .16, .045, "sawtooth");
      tone(146.8, now + .13, .22, .04, "square");
    } else if (kind === "static") {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .24), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = .055;
      source.buffer = buffer;
      source.connect(gain).connect(ctx.destination);
      source.start(now);
    } else if (kind === "play") {
      tone(440, now, .06, .02);
      tone(659.25, now + .055, .08, .018);
    } else {
      [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => tone(note, now + i * .09, .28, .027, "sine"));
      tone(392, now + .38, .45, .018, "sine");
    }
  };
  const toggleSound = () => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    const next = !sound;
    setSound(next);
    if (musicRef.current) {
      if (next) void musicRef.current.play().catch(() => {});
      else musicRef.current.pause();
    }
    if (next) setTimeout(() => playSound("startup", true), 0);
  };
  const startMedia = (target: HTMLElement) => {
    if (sound && musicRef.current?.paused) void musicRef.current.play().catch(() => {});
    if (target.closest(".tv-window") && videoRef.current?.paused) void videoRef.current.play().catch(() => {});
  };
  const openPost = (post: Post) => {
    setSelected(post);
    setPostOpen(true);
    playSound("error");
  };
  const switchChannel = (next: number) => {
    const wrapped = (next + videos.length) % videos.length;
    setStaticOn(true);
    setVideoLoading(true);
    setPlaying(false);
    playSound("static");
    window.setTimeout(() => { setChannel(wrapped); setStaticOn(false); }, 230);
  };
  const toggleVideo = async () => {
    const player = videoRef.current;
    if (!player) return;
    if (player.paused) { await player.play(); setPlaying(true); playSound("play"); }
    else { player.pause(); setPlaying(false); }
  };

  return (
    <main className="desktop" onClick={() => start && setStart(false)} onPointerDown={(e) => { const target = e.target as HTMLElement; startMedia(target); if (target.closest("button, a, input, select")) playSound("key"); }}>
      <audio ref={musicRef} src={`${basePath}/audio/falling-pixels.mp3`} autoPlay loop preload="auto" onCanPlay={(event) => { event.currentTarget.volume = backgroundVolume; if (sound) void event.currentTarget.play().catch(() => {}); }} />
      <div className="scanlines" aria-hidden="true" />
      <div className="crt-flicker" aria-hidden="true" />
      <header className="desktop-stamp">THE_ONLY_ME_IS_ME.OS <span>archive build 2014—2025</span></header>
      <section className="desktop-icons" aria-label="Desktop icons">
        {icons.map((icon) => (
          <button className="desktop-icon" key={icon.id} onClick={() => show(icon.id)}>
            <span className="pixel-icon" aria-hidden="true">{icon.glyph}</span>
            <span className={active === icon.id ? "selected-label" : ""}>{icon.label}</span>
          </button>
        ))}
        <a className="desktop-icon external-shortcut" href="https://carmeliaong-create.github.io/the-only-me-is-me/" target="_blank" rel="noreferrer" aria-label="Open The Only Me Is Me">
          <span className="pixel-icon" aria-hidden="true">🪞</span>
          <span>The Only Me Is Me</span>
        </a>
      </section>

      {open.includes("diary") && (
        <section className={`window diary-window ${active === "diary" ? "is-active" : ""}`} onMouseDown={() => setActive("diary")}>
          <div className="titlebar"><span>📁 Diary — {entries.length} objects</span><div><button aria-label="Minimize">_</button><button aria-label="Close" onClick={() => close("diary")}>×</button></div></div>
          <div className="menubar"><u>F</u>ile　 <u>E</u>dit　 <u>V</u>iew　 <u>H</u>elp</div>
          <div className="toolbar">
            <label>Find: <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="words I left behind" /></label>
            <label>Year: <select value={year} onChange={(e) => setYear(e.target.value)}><option value="all">All</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          </div>
          <div className="explorer">
            <nav className="file-list" aria-label="Diary entries">
              {filtered.map((post, index) => (
                <button key={`${post.url}-${index}`} className={selected.url === post.url ? "file selected-file" : "file"} onClick={() => openPost(post)}>
                  <span>📝</span><span><b>{postName(post)}</b><small>{post.date}</small></span>
                </button>
              ))}
              {!filtered.length && <p className="empty">No files found. Try remembering differently.</p>}
            </nav>
            <aside className="folder-help">
              <div className="folder-help-icon">📁</div>
              <h1>Diary</h1>
              <p>Select any document to open it as a system error.</p>
              <div className="folder-rule" />
              <p><b>{filtered.length}</b> messages currently visible</p>
              <p className="muted">Some thoughts could not be processed normally.</p>
            </aside>
          </div>
          <div className="statusbar"><span>{filtered.length} object(s)</span><span>{selected.text.length} characters</span></div>
        </section>
      )}

      {open.includes("photos") && (
        <section className={`window photo-window ${active === "photos" ? "is-active" : ""}`} onMouseDown={() => setActive("photos")}>
          <div className="titlebar"><span>{"\u{1F4F7}"} 1998 — {photos1998.length} photographs</span><div><button aria-label="Minimize">_</button><button aria-label="Close" onClick={() => close("photos")}>×</button></div></div>
          <div className="menubar"><u>F</u>ile　 <u>E</u>dit　 <u>V</u>iew　 <u>H</u>elp</div>
          <div className="photo-browser">
            <div className="photo-stage">
              <div className="photo-mat"><img src={photos1998[photoIndex]} alt={`1998 photograph ${photoIndex + 1}`} /></div>
              <div className="photo-caption"><b>1998_{String(photoIndex + 1).padStart(2, "0")}.JPG</b><span>{photoIndex + 1} of {photos1998.length}</span></div>
              <div className="photo-controls"><button onClick={() => setPhotoIndex((photoIndex - 1 + photos1998.length) % photos1998.length)}>◀ Previous</button><button onClick={() => setPhotoIndex((photoIndex + 1) % photos1998.length)}>Next ▶</button></div>
            </div>
            <nav className="contact-sheet" aria-label="1998 photo thumbnails">
              {photos1998.map((photo, index) => <button key={photo} className={index === photoIndex ? "selected-photo" : ""} onClick={() => setPhotoIndex(index)}><img src={photo} alt="" loading="lazy" /><span>{String(index + 1).padStart(2, "0")}</span></button>)}
            </nav>
          </div>
          <div className="statusbar"><span>{photos1998.length} image(s)</span><span>Album: 1998</span></div>
        </section>
      )}

      {open.includes("notes") && (
        <section className={`window diary-window notes-window ${active === "notes" ? "is-active" : ""}`} onMouseDown={() => setActive("notes")}>
          <div className="titlebar"><span>{"\u{1F5D2}\uFE0F"} Notes — {notes.length} essays</span><div><button aria-label="Minimize">_</button><button aria-label="Close" onClick={() => close("notes")}>×</button></div></div>
          <div className="menubar"><u>F</u>ile　 <u>E</u>dit　 <u>V</u>iew　 <u>H</u>elp</div>
          <div className="explorer notes-explorer">
            <nav className="file-list" aria-label="Substack essays">
              {notes.map((note, index) => (
                <button key={`${note.url}-${index}`} className={selected.url === note.url ? "file selected-file" : "file"} onClick={() => openPost(note)}>
                  <span>{"\u{1F4C4}"}</span><span><b>{postName(note)}</b><small>{note.date}</small></span>
                </button>
              ))}
            </nav>
            <aside className="folder-help">
              <div className="folder-help-icon">{"\u{1F5D2}\uFE0F"}</div>
              <h1>Notes</h1>
              <p>Essays from Mostly Introspection. Select a document to open it as a system error.</p>
              <div className="folder-rule" />
              <p><b>{notes.length}</b> essays saved locally</p>
              <p className="muted">Words recovered from the Substack archive.</p>
            </aside>
          </div>
          <div className="statusbar"><span>{notes.length} object(s)</span><span>Mostly Introspection</span></div>
        </section>
      )}

      {open.includes("tv") && (
        <section className={`window tv-window ${active === "tv" ? "is-active" : ""}`} onMouseDown={() => setActive("tv")}>
          <div className="titlebar"><span>📺 Home Videos — {videos.length} channels</span><div><button aria-label="Minimize">_</button><button aria-label="Close" onClick={() => close("tv")}>×</button></div></div>
          <div className="tv-room">
            <div className="television">
              <div className="tv-brand">MEMOREX</div>
              <div className="tv-screen-shell">
                <div className={staticOn ? "tv-screen is-static" : "tv-screen"}>
                  <video key={videos[channel].src} ref={videoRef} src={videos[channel].src} playsInline autoPlay preload="auto" onLoadStart={() => setVideoLoading(true)} onWaiting={() => setVideoLoading(true)} onCanPlay={(event) => { event.currentTarget.volume = volume; setVideoLoading(false); void event.currentTarget.play().catch(() => {}); }} onPlaying={() => { setPlaying(true); setVideoLoading(false); }} onPause={() => setPlaying(false)} onEnded={() => switchChannel(channel + 1)} />
                  <div className="tv-glass" aria-hidden="true" />
                  {staticOn && <div className="static-noise" aria-hidden="true" />}
                  <div className="channel-display">CH {String(videos[channel].channel).padStart(2,"0")}</div>
                  {videoLoading && !staticOn && <div className="video-loading">LOADING...</div>}
                  {!playing && !staticOn && <button className="screen-play" onClick={toggleVideo} aria-label="Play video">▶</button>}
                </div>
              </div>
              <div className="tv-console">
                <div><b>{videos[channel].label}</b><small>TAPE {videos[channel].name} • {Math.floor(videos[channel].duration / 60)}:{String(Math.round(videos[channel].duration % 60)).padStart(2,"0")}</small></div>
                <div className="tv-console-right">
                  <label className="tv-volume">VOL <input aria-label="Television volume" type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={(event) => { const next = Number(event.target.value) / 100; setVolume(next); if (videoRef.current) videoRef.current.volume = next; }} /><output>{Math.round(volume * 100)}%</output></label>
                  <div className="tv-controls"><button onClick={() => switchChannel(channel - 1)} aria-label="Previous tape">◀ CH</button><button onClick={toggleVideo}>{playing ? "Ⅱ PAUSE" : "▶ PLAY"}</button><button onClick={() => switchChannel(channel + 1)} aria-label="Next tape">CH ▶</button></div>
                </div>
              </div>
            </div>
            <nav className="tape-list" aria-label="Videos sorted by date">
              <h2>RECORDED TAPES</h2>
              {videos.map((video, index) => <button key={video.src} className={index === channel ? "current-tape" : ""} onClick={() => switchChannel(index)}><span>▣ {String(video.channel).padStart(2,"0")}</span><span>{video.label}</span></button>)}
            </nav>
          </div>
        </section>
      )}

      {postOpen && (
        <section className="post-error" role="dialog" aria-modal="true" aria-labelledby="post-error-title">
          <div className="error-titlebar"><span id="post-error-title">Error — {selected.date}</span><button aria-label="Close message" onClick={() => setPostOpen(false)}>×</button></div>
          <div className="error-content">
            <div className="error-symbol" aria-hidden="true">×</div>
            <div className="error-copy">
              <h2>{postName(selected)}</h2>
              <div className="error-text">{selected.text}</div>
            </div>
          </div>
          <div className="error-actions"><button onClick={() => setPostOpen(false)}>OK</button><a href={selected.url} target="_blank" rel="noreferrer">Original</a></div>
        </section>
      )}

      {open.includes("about") && <Dialog title="My Computer" active={active === "about"} onFocus={() => setActive("about")} onClose={() => close("about")}>
        <div className="system-copy"><div className="computer">🖥️</div><div><h2>the only me is me</h2><p>a small machine for keeping what could not be discarded.</p><dl><dt>Entries</dt><dd>{entries.length}</dd><dt>First file</dt><dd>{entries.at(-1)?.date}</dd><dt>Last file</dt><dd>{entries[0]?.date}</dd></dl></div></div>
      </Dialog>}
      {open.includes("archive") && <Dialog title="Archive Properties" active={active === "archive"} onFocus={() => setActive("archive")} onClose={() => close("archive")}>
        <p>This folder contains the complete public Blogger archive, arranged from newest to oldest.</p><div className="year-grid">{years.map(y => <button key={y} onClick={() => { setYear(y); show("diary"); }}>📂 {y}<small>{entries.filter(p => p.date.endsWith(y)).length} files</small></button>)}</div>
      </Dialog>}
      {open.includes("internet") && <Dialog title="The Internet" active={active === "internet"} onFocus={() => setActive("internet")} onClose={() => close("internet")}>
        <div className="internet"><span>🌐</span><p>The web moved on. The words stayed put.</p><a href="https://substack.com/@mostlyintrospection/posts" target="_blank" rel="noreferrer">substack.com/@mostlyintrospection</a></div>
      </Dialog>}
      {open.includes("trash") && <Dialog title="Recycle Bin" active={active === "trash"} onFocus={() => setActive("trash")} onClose={() => close("trash")}>
        <div className="warning"><span>⚠️</span><p>Nothing was deleted.<br/><small>That may be the problem.</small></p></div>
      </Dialog>}

      {clippyVisible && <aside className="clippy" role="dialog" aria-label="Clippy asks a question">
        <div className="clippy-bubble"><button className="clippy-close" aria-label="Dismiss Clippy" onClick={() => setClippyVisible(false)}>×</button><p>{clippyQuestions[clippyQuestion]}</p><div><button onClick={() => setClippyQuestion((clippyQuestion + 1) % clippyQuestions.length)}>ASK AGAIN</button><button onClick={() => setClippyVisible(false)}>NOT NOW</button></div></div>
        <div className="clippy-character" aria-hidden="true"><span className="clippy-wire"></span><span className="clippy-brow clippy-brow-left"></span><span className="clippy-brow clippy-brow-right"></span><span className="clippy-eye clippy-eye-left"><i></i></span><span className="clippy-eye clippy-eye-right"><i></i></span><span className="clippy-mouth"></span></div>
      </aside>}
      {start && <div className="start-menu" onClick={(e) => e.stopPropagation()}><div className="sideword">ONLY ME</div><div className="start-items"><button onClick={() => show("diary")}>📁　Diary</button><button onClick={() => show("tv")}>📺　Home Videos</button><button onClick={() => show("archive")}>📚　Archive</button><button onClick={() => show("about")}>🖥️　About this computer</button><hr/><button onClick={() => setStart(false)}>⌛　Shut down...</button></div></div>}
      <footer className="taskbar" onClick={(e) => e.stopPropagation()}><button className="start-button" onClick={() => setStart(!start)}>🏁 <b>Start</b></button><div className="tasks">{open.map(id => <button className={active === id ? "task active-task" : "task"} onClick={() => setActive(id)} key={id}>{id === "diary" ? "📁 Diary" : icons.find(i => i.id === id)?.glyph + " " + icons.find(i => i.id === id)?.label}</button>)}</div><label className="music-volume" title="Background music volume"><span>♫</span><input aria-label="Background music volume" type="range" min="0" max="100" value={Math.round(backgroundVolume * 100)} onChange={(event) => { const next = Number(event.target.value) / 100; setBackgroundVolume(next); if (musicRef.current) musicRef.current.volume = next; }} /><output>{Math.round(backgroundVolume * 100)}%</output></label><button className={sound ? "sound-button sound-on" : "sound-button"} onClick={toggleSound} aria-pressed={sound} title="Toggle retro sounds">{sound ? "🔊" : "🔇"}</button><div className="clock">{new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</div></footer>
    </main>
  );
}

function Dialog({ title, children, onClose, onFocus, active }: { title: string; children: React.ReactNode; onClose: () => void; onFocus: () => void; active: boolean }) {
  return <section className={`window dialog-window ${active ? "is-active" : ""}`} onMouseDown={onFocus}><div className="titlebar"><span>{title}</span><div><button aria-label="Close" onClick={onClose}>×</button></div></div><div className="dialog-body">{children}<div className="dialog-actions"><button onClick={onClose}>OK</button></div></div></section>
}
