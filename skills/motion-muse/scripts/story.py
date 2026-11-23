#!/usr/bin/env python3
"""Voiceless cartoon stories: script.json -> timeline.json + storyboard.json + .vtt, and export to an OpenFilm project.

  story.py build  <project> src/<slug>/script.json [--no-subs]   # times every line from its Thai length, places SFX/music
  story.py openfilm <project> src/<slug>/storyboard.json --out ~/films/<slug>   # after director.py render

script.json: {title, comp, fps, width, height, cps?, caps?, cast:{id:{name,color}}, music:[{file, from?, volume?, trim?}],
  scenes:[{id, shot, min?, pad?, lead?, lines:[{who, text, hold?, sfx?:[{file, at?, volume?}]}], sfx?:[{file, at, volume?}]}]}
  times are seconds; a line's sfx 'at' is from the line's start, a scene's from the scene's start; files are under public/.
"""
import argparse, glob, html, json, os, re, shutil, subprocess, sys

MARKS = re.compile(r"[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]")


def glyphs(text):
    """Thai-aware length: combining vowels and tone marks do not count."""
    return len(MARKS.sub("", re.sub(r"\s+", "", text)))


def line_secs(text, cps, hold):
    return max(1.5, glyphs(text) / cps + 0.5) + hold


def ts(sec):
    h, r = divmod(max(0.0, sec), 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def vtt(cues):
    """cues: [(start, end, text)] seconds; a timestamp tag at each space-separated word."""
    out = ["WEBVTT", ""]
    for i, (a, b, text) in enumerate(cues, 1):
        words = text.split()
        tot = sum(max(1, glyphs(w)) for w in words) or 1
        t, parts = a, []
        for k, w in enumerate(words):
            parts.append(w if k == 0 else f"<{ts(t)}>{w}")
            t += (b - a) * max(1, glyphs(w)) / tot
        out += [str(i), f"{ts(a)} --> {ts(b)}", " ".join(parts), ""]
    return "\n".join(out)


def cmd_build(a):
    P = os.path.abspath(a.project); sp = os.path.abspath(a.script)
    sc = json.load(open(sp, encoding="utf-8"))
    fps, cps = sc.get("fps", 30), sc.get("cps", 11)
    F = lambda s: int(round(s * fps))
    pub = os.path.join(P, "public")
    missing = sorted({c["file"] for s in sc["scenes"] for c in s.get("sfx", []) + [x for l in s.get("lines", []) for x in l.get("sfx", [])]}
                     | {m["file"] for m in sc.get("music", [])})
    missing = [m for m in missing if not os.path.isfile(os.path.join(pub, m))]
    if missing: sys.exit("missing under public/: " + ", ".join(missing))
    tl = {"fps": fps, "width": sc["width"], "height": sc["height"], "scenes": [], "lines": [], "sfx": [], "music": []}
    sb_scenes, t = [], 0
    for s in sc["scenes"]:
        start, cur = t, t + F(s.get("lead", 0.5))
        for i, l in enumerate(s.get("lines", [])):
            d = F(line_secs(l["text"], cps, l.get("hold", 0.25)))
            tl["lines"].append({"id": f"{s['id']}-{i + 1}", "scene": s["id"], "who": l["who"], "text": l["text"], "from": cur, "dur": d})
            for x in l.get("sfx", []):
                tl["sfx"].append({"file": x["file"], "from": cur + F(x.get("at", 0)), "volume": x.get("volume", 0.6), "scene": s["id"]})
            cur += d + F(l.get("gap", 0.15))
        dur = max(cur + F(s.get("pad", 0.6)) - start, F(s.get("min", 2)))
        for x in s.get("sfx", []):
            tl["sfx"].append({"file": x["file"], "from": start + F(x.get("at", 0)), "volume": x.get("volume", 0.6), "scene": s["id"]})
        tl["scenes"].append({"id": s["id"], "from": start, "dur": dur})
        sb_scenes.append({"id": s["id"], "dur": dur, "caps": s.get("caps", sc.get("caps", ["3d", "toon", "thai-type"])),
                          "shot": s.get("shot", ""), "text": " / ".join(l["text"] for l in s.get("lines", [])), "out": s.get("out", "cut")})
        t = start + dur
    tl["total"] = t
    for m in sc.get("music", []):
        c = {"file": m["file"], "from": F(m.get("from", 0)), "volume": m.get("volume", 0.22), "trim": m.get("trim", 0)}
        if "dur" in m: c["dur"] = F(m["dur"])
        tl["music"].append(c)
    tl["sfx"].sort(key=lambda x: x["from"])
    d = os.path.dirname(sp)
    json.dump(tl, open(os.path.join(d, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sb = {"title": sc["title"], "comp": sc["comp"], "fps": fps, "width": sc["width"], "height": sc["height"],
          "brief": sc.get("brief", ""), "style": sc.get("style", {}), "caps": sorted({c for s in sb_scenes for c in s["caps"]}),
          "props": {"subs": not a.no_subs}, "scenes": sb_scenes}
    json.dump(sb, open(os.path.join(d, "storyboard.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    cues = [(l["from"] / fps, (l["from"] + l["dur"]) / fps, l["text"]) for l in tl["lines"]]
    open(os.path.join(d, f"{sc['comp']}.vtt"), "w", encoding="utf-8").write(vtt(cues))
    print(f"OK {len(tl['scenes'])} scenes, {len(tl['lines'])} lines, {len(tl['sfx'])} sfx, {t / fps:.1f}s → {d}/timeline.json storyboard.json {sc['comp']}.vtt")
    for s in tl["scenes"]: print(f"  {s['id']:<14} {s['from'] / fps:6.1f}s +{s['dur'] / fps:.1f}s")


def cmd_openfilm(a):
    """Rendered scenes (out/scenes/<comp>/) + timeline audio -> an OpenFilm project: film.html + assets/."""
    P = os.path.abspath(a.project); sbp = os.path.abspath(a.storyboard)
    sb = json.load(open(sbp, encoding="utf-8")); tl = json.load(open(os.path.join(os.path.dirname(sbp), "timeline.json"), encoding="utf-8"))
    fps, comp = sb["fps"], sb["comp"]
    if sb.get("props", {}).get("subs", True):
        print("note: the scenes have burned-in subtitles; OpenFilm makes its own from the .vtt files. Run `story.py build --no-subs` and render again for clean shots.")
    out = os.path.abspath(os.path.expanduser(a.out)); A = os.path.join(out, "assets")
    if os.path.exists(os.path.join(out, "film.html")) and not a.force:
        sys.exit(f"{out}/film.html exists and may hold Studio edits; its shots and sounds would be replaced under it. "
                 "Export to a new --out, or pass --force to overwrite the film and its assets.")
    for sub in ("shots", "sfx", "music"): os.makedirs(os.path.join(A, sub), exist_ok=True)
    sdir = os.path.join(P, "out", "scenes", comp)
    shots, tracks_sfx, music = [], [], []
    for i, s in enumerate(sb["scenes"]):
        src = sorted(glob.glob(os.path.join(sdir, f"{i:02d}-{s['id']}-*.mp4")), key=os.path.getmtime)
        if not src: sys.exit(f"scene {s['id']} not rendered: run director.py render first")
        dst = f"assets/shots/{i + 1:02d}-{s['id']}.mp4"
        shutil.copy2(src[-1], os.path.join(out, dst))
        sc = next(x for x in tl["scenes"] if x["id"] == s["id"])
        cues = [((l["from"] - sc["from"]) / fps, (l["from"] + l["dur"] - sc["from"]) / fps, l["text"]) for l in tl["lines"] if l["scene"] == s["id"]]
        if cues: open(os.path.join(out, dst[:-4] + ".vtt"), "w", encoding="utf-8").write(vtt(cues))
        shots.append(f'  <video src="{dst}#t=0,{s["dur"] / fps:.3f}" at="{sc["from"] / fps:.3f}" id="{s["id"]}"></video>')
    def put(sub, f):  # the path under public/ names the asset, so two files with one basename stay apart
        rel = re.sub(rf"^(audio/)?({sub}/)?", "", os.path.normpath(f).replace("\\", "/").lstrip("./"))
        dst = f"assets/{sub}/" + re.sub(r"[/\s#?%&\"'<>]+", "-", rel)  # the name goes into a URL
        shutil.copy2(os.path.join(P, "public", f), os.path.join(out, dst))
        return dst
    def length(f):  # decoded length: browsers drop the encoder padding that ffprobe's duration counts
        r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-stats", "-i", os.path.join(P, "public", f), "-f", "null", "-"], capture_output=True, text=True)
        m = re.findall(r"time=(\d+):(\d+):([\d.]+)", r.stderr)
        if not m: return 2.0
        h, mi, se = m[-1]
        return max(0.05, int(h) * 3600 + int(mi) * 60 + float(se) - 0.01)
    lanes = []  # pack SFX onto as few non-overlapping tracks as possible
    for k, x in enumerate(tl["sfx"]):
        a0 = x["from"] / fps; ln = min(length(x["file"]), (x.get("dur") or 1e9) / fps)
        lane = next((j for j, end in enumerate(lanes) if end <= a0 + 1e-3), None)
        if lane is None: lanes.append(0); tracks_sfx.append([]); lane = len(lanes) - 1
        lanes[lane] = a0 + ln
        tracks_sfx[lane].append(f'  <audio src="{put("sfx", x["file"])}#t=0,{ln:.3f}" at="{a0:.3f}" volume="{x.get("volume", 0.6)}" id="sfx{k + 1}"></audio>')
    for k, m in enumerate(tl["music"]):
        a0 = m["from"] / fps; ln = (m.get("dur") or (tl["total"] - m["from"])) / fps; tr = m.get("trim", 0)
        ln = min(ln, length(m["file"]) - tr)
        music.append(f'  <audio src="{put("music", m["file"])}#t={tr:.3f},{tr + ln:.3f}" at="{a0:.3f}" volume="{m.get("volume", 0.22)}" id="music{k + 1}"></audio>')
    sec = lambda rows: "<section>\n" + "\n".join(rows) + "\n</section>"
    film = "\n".join([
        "<!doctype html>", "<html>", "<head>", '<meta charset="utf-8">',
        f'<meta name="viewport" content="width={sb["width"]}, height={sb["height"]}">',
        f"<title>{html.escape(sb['title'])}</title>", "</head>", "<body>",
        sec(shots), *[sec(r) for r in tracks_sfx], *([sec(music)] if music else []), "</body>", "</html>", ""])
    fp = os.path.join(out, "film.html")
    open(fp, "w", encoding="utf-8").write(film)
    print(f"OK {len(shots)} shots, {sum(map(len, tracks_sfx))} sfx on {len(tracks_sfx)} tracks, {len(music)} music → {fp}")
    print(f"open it: cd {out} && npx -y openfilm@latest   (Studio)   |   check: npx openfilm look   |   render: npx openfilm render --loudness=-14")


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
s = ap.add_subparsers(dest="cmd", required=True)
b = s.add_parser("build"); b.add_argument("project"); b.add_argument("script"); b.add_argument("--no-subs", action="store_true", help="no burned-in subtitles (for OpenFilm export)")
o = s.add_parser("openfilm"); o.add_argument("project"); o.add_argument("storyboard"); o.add_argument("--out", required=True); o.add_argument("--force", action="store_true")
a = ap.parse_args()
{"build": cmd_build, "openfilm": cmd_openfilm}[a.cmd](a)
