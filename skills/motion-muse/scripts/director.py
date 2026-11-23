#!/usr/bin/env python3
"""Motion Muse director: capability-based tool router, project init, storyboard check,
scene-level cached rendering, assembly and QA. Code-first only (no AI video generators, no Blender).

  director.py route "brief text"                 # capabilities → smallest toolset (+ --json)
  director.py init  <project> --caps 3d,diagram  # project from the starter; installs only what the caps need
  director.py check <storyboard.json>            # validate scenes, print the storyboard table
  director.py render <project> <storyboard.json> [--force] [--gl swangle]   # per-scene render + cache + assemble + QA
  director.py qa <video.mp4> [--storyboard sb.json]
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
SKILLS_DIR = os.environ.get("SKILLS_DIR", os.path.expanduser("~/skills"))
TEMPLATE = os.path.join(SKILLS_DIR, "video-shotcraft", "template")
RV = "4.0.484"

# capability → (keywords EN/TH, technology, npm packages, kit files, note)
CAPS = {
    "thai-type":    (r"thai|ไทย|typograph|ตัวอักษร|ฟอนต์|font|title|ข้อความ", "CSS + lib/typography (Intl.Segmenter)", [], [], "pick a font from THAI_FONTS by mood; scripts/thai-fonts.sh"),
    "character-2d": (r"stick ?man|stickman|ก้างปลา|cartoon|การ์ตูน|character|ตัวละคร|mascot|vector", "SVG + lib/characters + lib/pose", [], [], "Stickman / VectorCharacter, gaits, key poses, talking"),
    "diagram":      (r"explain|อธิบาย|diagram|ไดอะแกรม|science|วิทยา|biology|ชีว|education|สอน|infographic|how .* works|chart|กราฟ", "SVG + lib/diagram", [], [], "Draw, Arrow, Callout, Flow, Ecg, Blob, Virus"),
    "data-viz":     (r"data|ข้อมูล|statistic|สถิติ|chart|graph|map|แผนที่", "SVG + d3 (scales/shapes only)", ["d3@7", "@types/d3@7"], [], "use d3 for maths, render with React; never d3 transitions"),
    "parallax":     (r"parallax|2\.5d|layer|landscape|วิว|ฉากหลัง|side.?scroll|storybook", "CSS transforms + lib/parallax", [], [], "Layer depth, Ridge, Skyline, FogBand"),
    "3d":           (r"\b3d\b|สามมิติ|three|camera|กล้อง|environment|world|ฉาก 3|product.*(render|3d)|cinematic", "@remotion/three + React Three Fiber + lib/three", [f"@remotion/three@{RV}", "three@0.178.0", "@react-three/fiber@9.3.0", "@types/three@0.178.0"], ["three/three.tsx"], "frame-driven only (no useFrame); --gl=swangle without a GPU"),
    "toon":         (r"toon|cel.?shad|การ์ตูน ?3 ?d|3d cartoon|cartoon story|เล่าเรื่อง|ตลกร้าย|skit|sketch|episode|ตอน(ที่)?|ซอมบี้|zombie", "lib/toon (cel shading, ink outlines, 360° characters, sets) + lib/story + scripts/story.py", [f"@remotion/three@{RV}", "three@0.178.0", "@react-three/fiber@9.3.0", "@types/three@0.178.0"], ["three/three.tsx", "three/toon.tsx"], "references/toon-story.md; subtitles + SFX + music, voice only if asked; --gl=swangle without a GPU"),
    "atmosphere":   (r"horror|สยอง|น่ากลัว|fog|หมอก|cinematic|ภาพยนตร์|mood|light|แสง|rain|ฝน|dust|apocalyp|ล่มสลาย|dark", "CSS/SVG + lib/atmosphere", [], [], "GodRays, Fog, Particles, Glow, Vignette, Letterbox"),
    "product":      (r"product|สินค้า|luxury|หรู|premium|advert|โฆษณา|brand|แบรนด์|packshot|perfume|น้ำหอม|cosmetic", "lib/three Lathe + StudioLights (3D) or CSS layers (2D)", [], [], "minimal layout, slow camera, light sweep, one idea per shot"),
    "lottie":       (r"lottie|\.json animation|after effects", "@remotion/lottie (user-supplied files only)", [f"@remotion/lottie@{RV}", "lottie-web"], [], "only for Lottie files the user provides or has a license for"),
    "gsap":         (r"gsap|timeline-heavy|stagger.*complex", "GSAP timeline seeked by frame", ["gsap@3"], [], "build a paused timeline and tl.seek(frame / fps); never let it play"),
    "canvas":       (r"particle|อนุภาค|generative|flow field|procedural texture|thousands", "Canvas 2D drawn per frame (useCurrentFrame)", [], [], "for >2k particles; redraw fully every frame from the frame number"),
    "footage":      (r"footage|ฟุตเทจ|clip|คลิป|b-?roll|interview|สัมภาษณ์", "OffthreadVideo + footage pipeline", [], [], "references/footage-editing.md"),
}
ALWAYS = ["thai-type"]


def caps_for(text):
    t = text.lower()
    found = [c for c, (rx, *_rest) in CAPS.items() if re.search(rx, t)]
    if "toon" in found and re.search(r"stick ?man|stickman|ก้างปลา|vector|2d|2 มิติ", t) and not re.search(r"3 ?d|3 ?มิติ|สามมิติ|toon|cel.?shad", t):
        found = [c for c in found if c != "toon"]
    if "toon" in found:
        if "3d" not in found:
            found.append("3d")
        if not re.search(r"stick ?man|stickman|ก้างปลา|vector|2d|2 มิติ", t):
            found = [c for c in found if c != "character-2d"]
        if not re.search(r"footage|ฟุตเทจ|b-?roll|interview|สัมภาษณ์", t):
            found = [c for c in found if c != "footage"]
    return list(dict.fromkeys(ALWAYS + found))


def plan(caps):
    pk, kits = [], []
    for c in caps:
        _, tech, p, k, _ = CAPS[c]
        pk += p; kits += k
    return list(dict.fromkeys(pk)), list(dict.fromkeys(kits))


def cmd_route(a):
    caps = a.caps.split(",") if a.caps else caps_for(a.brief)
    pk, kits = plan(caps)
    out = {"caps": caps, "tech": {c: CAPS[c][1] for c in caps}, "npm": pk, "kits": kits,
           "gl": "swangle (or angle with a GPU)" if "3d" in caps else "default", "notes": {c: CAPS[c][4] for c in caps}}
    if a.json:
        print(json.dumps(out, ensure_ascii=False, indent=1)); return
    print("capability     technology")
    for c in caps:
        print(f"{c:14} {CAPS[c][1]}  ({CAPS[c][4]})")
    print("npm to install:", " ".join(pk) or "nothing (starter only)")
    if "3d" in caps:
        print("render flag: --gl=swangle on machines without a GPU (director.py render picks it automatically)")


def installed(pkg):
    name = pkg.rsplit("@", 1)[0] if pkg.count("@") > (1 if pkg.startswith("@") else 0) else pkg
    return os.path.isdir(os.path.join(TEMPLATE, "node_modules", name))


def cmd_init(a):
    caps = a.caps.split(",") if a.caps else ALWAYS
    pk, kits = plan(caps)
    P = os.path.abspath(a.project)
    for d in ("public/fonts", "public/audio", "out"):
        os.makedirs(os.path.join(P, d), exist_ok=True)
    for f in ("package.json", "tsconfig.json", "remotion.config.ts"):
        shutil.copy(os.path.join(TEMPLATE, f), P)
    ts = os.path.join(P, "tsconfig.json"); s = open(ts).read()
    if "resolveJsonModule" not in s:
        open(ts, "w").write(s.replace('"compilerOptions": {', '"compilerOptions": {\n    "resolveJsonModule": true,', 1))
    nm = os.path.join(P, "node_modules")
    if not os.path.exists(nm):
        os.symlink(os.path.join(TEMPLATE, "node_modules"), nm)
    if not os.path.exists(os.path.join(P, "src")):
        shutil.copytree(os.path.join(SKILL, "starter", "src"), os.path.join(P, "src"))
    for k in kits:
        shutil.copy(os.path.join(SKILL, "starter", "kits", k), os.path.join(P, "src", "lib", os.path.basename(k)))
    for f in os.listdir(os.path.join(SKILLS_DIR, "fonts", "prompt")):
        if f.endswith(".ttf"):
            shutil.copy(os.path.join(SKILLS_DIR, "fonts", "prompt", f), os.path.join(P, "public", "fonts"))
    # the transition SFX Timeline plays (Shotcraft keeps them in sub-folders; the bundled BGM is not copied)
    sfx = {f: os.path.join(dp, f) for r in (os.path.join(SKILLS_DIR, "video-shotcraft", "assets", "audio", "sfx"), os.path.join(TEMPLATE, "public", "audio"))
           for dp, _, fs in os.walk(r) for f in fs}
    for f in set(re.findall(r"file: '([^']+)'", open(os.path.join(P, "src", "transitions.tsx")).read())):
        if f in sfx and not os.path.exists(os.path.join(P, "public", "audio", f)):
            shutil.copy(sfx[f], os.path.join(P, "public", "audio"))
        elif f not in sfx:
            print(f"WARN: transition SFX {f} not found (Timeline sfx={{false}} or add it to public/audio)")
    need = [p for p in pk if not installed(p)]
    if need:
        print("installing (only for these caps):", " ".join(need))
        keep = [x for c in CAPS for x in CAPS[c][2] if installed(x)]  # npm prunes unsaved packages it is not told about
        r = subprocess.run(["npm", "i", "--no-save", "--no-audit", "--no-fund", "--loglevel=error", *dict.fromkeys(keep + need)], cwd=TEMPLATE)
        if r.returncode: sys.exit("npm install failed")
    print(f"OK {P}  caps={','.join(caps)}  kits={','.join(kits) or '-'}")


def load_sb(path):
    sb = json.load(open(path, encoding="utf-8"))
    errs = []
    for k in ("comp", "fps", "width", "height", "scenes"):
        if k not in sb: errs.append(f"missing '{k}'")
    ids = set()
    for i, s in enumerate(sb.get("scenes", [])):
        if not s.get("id") or s["id"] in ids: errs.append(f"scene {i}: missing or duplicate id")
        ids.add(s.get("id"))
        if not isinstance(s.get("dur"), int) or s["dur"] < 12: errs.append(f"scene {s.get('id')}: dur must be an int ≥ 12 frames")
        for c in s.get("caps", []):
            if c not in CAPS: errs.append(f"scene {s.get('id')}: unknown cap '{c}'")
    if errs: sys.exit("storyboard errors:\n  " + "\n  ".join(errs))
    return sb


def cmd_check(a):
    sb = load_sb(a.storyboard)
    fps, t = sb["fps"], 0
    print(f"# {sb.get('title', sb['comp'])}  ({sb['width']}x{sb['height']} @ {fps} fps)\n")
    print("| # | scene | at | length | caps | shot | motion | text | out |\n|---|---|---|---|---|---|---|---|---|")
    for i, s in enumerate(sb["scenes"]):
        print(f"| {i + 1} | {s['id']} | {t / fps:.1f}s | {s['dur'] / fps:.1f}s | {', '.join(s.get('caps', []))} | {s.get('shot', '')} | {s.get('motion', '')} | {s.get('text', '')} | {s.get('out', '')} |")
        t += s["dur"]
    lens = [s["dur"] for s in sb["scenes"]]
    print(f"\ntotal {t / fps:.1f}s, {len(lens)} scenes")
    if len(set(lens)) == 1 and len(lens) > 2: print("WARN: every scene has the same length (looks generated); vary them")
    if any(not s.get("motion") for s in sb["scenes"]): print("WARN: a scene has no 'motion': every scene needs real movement")
    pk, _ = plan(sorted({c for s in sb["scenes"] for c in s.get("caps", [])}))
    print("toolset:", ", ".join(sorted({CAPS[c][1] for s in sb["scenes"] for c in s.get("caps", [])})))
    print("npm:", " ".join(pk) or "nothing extra")


def sha(paths, extra):
    h = hashlib.sha256(json.dumps(extra, sort_keys=True, ensure_ascii=False).encode())
    for p in sorted(paths):
        if os.path.isfile(p):
            h.update(p.encode()); h.update(open(p, "rb").read())
    return h.hexdigest()[:12]


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def motion_score(path):
    """Mean absolute frame difference (0-255) at 6 fps; ~0 means a static slide."""
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", "fps=6,scale=96:-2,format=gray", "-f", "rawvideo", "-"], capture_output=True)
    raw = r.stdout
    w = 96; h = None
    probe = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path]).stdout.strip().split(",")
    if len(probe) == 2: h = round(96 * int(probe[1]) / int(probe[0]) / 2) * 2
    n = w * (h or 96)
    fr = [raw[i:i + n] for i in range(0, len(raw) - n + 1, n)]
    if len(fr) < 2: return 0.0
    diffs = [sum(abs(a - b) for a, b in zip(fr[i], fr[i + 1])) / n for i in range(len(fr) - 1)]
    still = max((sum(1 for _ in g) for k, g in __import__("itertools").groupby(d < 0.15 for d in diffs) if k), default=0) / 6
    return round(sum(diffs) / len(diffs), 2), round(still, 2)


def cmd_render(a):
    P = os.path.abspath(a.project); sb = load_sb(a.storyboard)
    fps = sb["fps"]
    caps = {c for s in sb["scenes"] for c in s.get("caps", [])}
    gl = a.gl or os.environ.get("MOTION_MUSE_GL") or ("swangle" if caps & {"3d", "toon"} else None)
    src = os.path.join(P, "src")
    # cache key inputs: the composition folder (where the storyboard lives) + shared lib/transitions, not unrelated comps
    comp_dir = os.path.dirname(os.path.abspath(a.storyboard))
    roots = [comp_dir, os.path.join(src, "lib")] if comp_dir.startswith(src + os.sep) and comp_dir != src else [src]
    lib = [os.path.join(dp, f) for r in roots for dp, _, fs in os.walk(r) for f in fs if f.endswith((".ts", ".tsx", ".json"))]
    lib += [os.path.join(src, f) for f in ("transitions.tsx", "theme.ts", "index.ts", "Root.tsx") if os.path.isfile(os.path.join(src, f))]
    pub = os.path.join(P, "public")  # assets (music, sfx, fonts, footage) by size+mtime, so a replaced file invalidates
    assets = {os.path.relpath(os.path.join(dp, f), pub): [os.path.getsize(os.path.join(dp, f)), int(os.path.getmtime(os.path.join(dp, f)))]
              for dp, _, fs in os.walk(pub) for f in fs}
    fmt = {k: sb[k] for k in ("fps", "width", "height")}
    sdir = os.path.join(P, "out", "scenes", sb["comp"]); os.makedirs(sdir, exist_ok=True)
    parts, t, rendered, cached = [], 0, 0, 0
    for i, s in enumerate(sb["scenes"]):
        a0, a1 = t, t + s["dur"] - 1
        nb = sb["scenes"][max(0, i - 1):i + 2]
        own = [os.path.join(P, f) for n in nb for f in n.get("files", [])]  # transitions draw the neighbours too
        shared = [x for x in lib if "/lib/" in x or x.endswith(("transitions.tsx", "theme.ts", "index.ts", "Root.tsx"))]
        files = own + (shared if all(n.get("files") for n in nb) else lib)
        key = sha(files, {"comp": sb["comp"], "range": [a0, a1], "scenes": nb, "props": sb.get("props"), "fmt": fmt, "assets": assets})
        out = os.path.join(sdir, f"{i:02d}-{s['id']}-{key}.mp4")
        if os.path.exists(out) and not a.force:
            cached += 1; print(f"CACHED {s['id']} frames {a0}-{a1}")
        else:
            for old in os.listdir(sdir):
                if old.startswith(f"{i:02d}-{s['id']}-"): os.remove(os.path.join(sdir, old))
            cmd = ["npx", "remotion", "render", "src/index.ts", sb["comp"], out, f"--frames={a0}-{a1}", "--muted", "--timeout=120000", "--log=error"]
            if sb.get("props"): cmd.append("--props=" + json.dumps(sb["props"], ensure_ascii=False))
            if gl: cmd.append(f"--gl={gl}")
            if a.concurrency: cmd.append(f"--concurrency={a.concurrency}")
            print(f"RENDER {s['id']} frames {a0}-{a1}{' gl=' + gl if gl else ''}", flush=True)
            r = run(cmd, cwd=P)
            if r.returncode:
                sys.exit(f"FAIL {s['id']}:\n{r.stderr[-3000:]}")
            rendered += 1
        m, still = motion_score(out)
        flag = "  WARN static" if m < 0.4 or still > 1.0 else ""
        print(f"   motion {m}  longest still {still}s{flag}")
        parts.append(out); t += s["dur"]
    lst = os.path.join(sdir, "concat.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    video = os.path.join(P, "out", f"{sb['comp']}.video.mp4")
    r = run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video])
    if r.returncode: sys.exit(r.stderr)
    audio = os.path.join(P, "out", f"{sb['comp']}.audio.wav")
    akey = sha(lib, {"comp": sb["comp"], "total": t, "fmt": fmt, "assets": assets})
    astamp = audio + ".key"
    stale = a.force or not os.path.exists(audio) or not os.path.exists(astamp) or open(astamp).read() != akey
    if stale:
        r = run(["npx", "remotion", "render", "src/index.ts", sb["comp"], audio, "--codec=wav", "--log=error", "--timeout=120000"] + ([f"--gl={gl}"] if gl else []) + (["--props=" + json.dumps(sb["props"], ensure_ascii=False)] if sb.get("props") else []), cwd=P)
        if r.returncode: sys.exit(f"FAIL audio:\n{r.stderr[-2000:]}")
        open(astamp, "w").write(akey)
    final = os.path.join(P, "out", f"{sb['comp']}.mp4")
    r = run(["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", final])
    if r.returncode: sys.exit(r.stderr)
    print(f"\n{rendered} scenes rendered, {cached} from cache → {final}")
    a.video = final; cmd_qa(a, sb)


def cmd_qa(a, sb=None):
    v = a.video
    if sb is None and getattr(a, "storyboard", None): sb = load_sb(a.storyboard)
    d = run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height,r_frame_rate", "-of", "json", v]).stdout
    info = json.loads(d)
    print("streams:", ", ".join(f"{s.get('codec_name')} {s.get('width', '')}x{s.get('height', '')}".strip() for s in info["streams"]), f"duration {float(info['format']['duration']):.2f}s")
    if sb:
        exp = sum(s["dur"] for s in sb["scenes"]) / sb["fps"]
        if abs(exp - float(info["format"]["duration"])) > 0.2: print(f"WARN duration differs from storyboard ({exp:.2f}s)")
    lo = run(["ffmpeg", "-nostats", "-i", v, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", lo); TP = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", lo)
    if I: print(f"loudness {I[-1]} LUFS (target -16..-12), true peak {TP[-1] if TP else '?'} dBFS (keep below -1)")
    bl = run(["ffmpeg", "-i", v, "-vf", "blackdetect=d=0.4:pix_th=0.06", "-an", "-f", "null", "-"]).stderr
    blacks = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", bl)
    if blacks: print("black stretches (intentional?):", ", ".join(f"{float(s):.1f}-{float(e):.1f}s" for s, e in blacks))
    sheet = os.path.splitext(v)[0] + ".sheet.jpg"
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", v, "-vf", "fps=1,scale=240:-2,tile=8x3", "-frames:v", "1", sheet])
    print("contact sheet:", sheet, "(look at it: text inside the frame, nothing clipped, every scene moving)")


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sp = ap.add_subparsers(dest="cmd", required=True)
r = sp.add_parser("route"); r.add_argument("brief", nargs="?", default=""); r.add_argument("--caps"); r.add_argument("--json", action="store_true"); r.set_defaults(fn=cmd_route)
i = sp.add_parser("init"); i.add_argument("project"); i.add_argument("--caps"); i.set_defaults(fn=cmd_init)
c = sp.add_parser("check"); c.add_argument("storyboard"); c.set_defaults(fn=cmd_check)
re_ = sp.add_parser("render"); re_.add_argument("project"); re_.add_argument("storyboard"); re_.add_argument("--force", action="store_true"); re_.add_argument("--gl"); re_.add_argument("--concurrency", type=int); re_.set_defaults(fn=cmd_render)
q = sp.add_parser("qa"); q.add_argument("video"); q.add_argument("--storyboard"); q.set_defaults(fn=lambda a: cmd_qa(a))
a = ap.parse_args(); a.fn(a)
