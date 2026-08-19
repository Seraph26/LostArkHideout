from html.parser import HTMLParser
from urllib.request import Request, urlopen
from datetime import datetime, timezone
import json
import re
from pathlib import Path

URL = "https://lostark.bible/stats/raids?boss=Corvus%20Tul%20Rak&difficulty=Nightmare&patch=jun26&filterBy=ilvl&type=ndps&minIlvl=1740&maxIlvl=1810"
OUT = Path("raid-encounters.json")

# Bible's raid selector values are not always the boss identifier used by
# raidStatsSearch. These are the boss identifiers already verified for the
# LostArkHideout support-uptime queries. Keep these overrides authoritative so
# the scheduled manifest updater cannot replace them with generic Gate labels.
BOSS_OVERRIDES = {
    "horizon-cathedral-g1": "Archbishop Arcenos",
    "horizon-cathedral-g2": "Arcenos, Vanguard of Fanaticism",
    "serca-g1": "Witch of Agony, Serca",
    "serca-g2": "Corvus Tul Rak",
    "kazeros-g1": "Abyss Lord Kazeros",
    "kazeros-g2": "Death Incarnate Kazeros",
    "armoche-g1": "Brelshaza, Ember in the Ashes",
    "armoche-g2": "Armoche, Sentinel of the Abyss",
    "extreme-aegir-g2": "Aegir, the Oppressor",
    "extreme-brelshaza-g2": "Phantom Manifester Brelshaza",
}

class RaidParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.group = ""
        self.option = None
        self.options = []
        self.select_depth = 0
        self.in_optgroup = False
        self.in_option = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "select":
            name = (a.get("name") or "").lower()
            aria = (a.get("aria-label") or "").lower()
            if "raid" in name or "raid" in aria:
                self.select_depth += 1
        elif self.select_depth and tag == "optgroup":
            self.in_optgroup = True
            self.group = a.get("label") or ""
        elif self.select_depth and tag == "option":
            self.in_option = True
            self.option = {
                "value": a.get("value") or "",
                "disabled": "disabled" in a,
                "group": self.group,
                "text": "",
            }

    def handle_endtag(self, tag):
        if tag == "option" and self.in_option:
            if self.option and self.option["text"].strip():
                self.options.append(self.option)
            self.option = None
            self.in_option = False
        elif tag == "optgroup" and self.select_depth:
            self.in_optgroup = False
            self.group = ""
        elif tag == "select" and self.select_depth:
            self.select_depth -= 1

    def handle_data(self, data):
        if self.in_option and self.option is not None:
            self.option["text"] += data


def slug(value):
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value or "encounter"


def normalize_text(value):
    return re.sub(r"\s+", " ", value or "").strip()


def is_event(group, text):
    s = f"{group} {text}".lower()
    return any(x in s for x in ("extreme", "event", "abyssal", "special"))


def infer_difficulty(group, text):
    s = f"{group} {text}"
    match = re.search(r"\b(Level\s*[123])\b", s, re.I)
    if match:
        return re.sub(r"\s+", " ", match.group(1)).title()
    for difficulty in ("Normal", "Hard", "Nightmare", "Extreme"):
        if re.search(rf"\b{difficulty}\b", s, re.I):
            return difficulty
    return None


def infer_gate(text):
    match = re.search(r"\bG(?:ate\s*)?([123])\b", text, re.I)
    return int(match.group(1)) if match else None


def infer_schema(group, text):
    difficulty = infer_difficulty(group, text)
    if difficulty == "Extreme":
        return "extreme"
    if difficulty and difficulty.startswith("Level"):
        return "level"
    if difficulty in {"Normal", "Hard", "Nightmare"}:
        return "difficulty"
    return "unknown"


def main():
    req = Request(URL, headers={"User-Agent": "LostArkHideout raid manifest updater"})
    with urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", "replace")

    parser = RaidParser()
    parser.feed(html)

    enabled = [o for o in parser.options if not o["disabled"]]
    if not enabled:
        raise RuntimeError("Bible raid selector contained no enabled options")

    raids, events = [], []
    seen = set()
    for o in enabled:
        text = normalize_text(o["text"])
        key = (o["group"], text)
        if key in seen:
            continue
        seen.add(key)
        item_id = slug(f"{o['group']}-{text}")
        difficulty = infer_difficulty(o["group"], text)
        item = {
            "id": item_id,
            "label": text,
            "boss": BOSS_OVERRIDES.get(item_id, o["value"]),
            "kind": "event" if is_event(o["group"], text) else "raid",
            "sourceGroup": o["group"],
            "schema": infer_schema(o["group"], text),
            "difficulty": difficulty,
            "gate": infer_gate(text),
        }
        (events if item["kind"] == "event" else raids).append(item)

    data = {
        "source": "lostark.bible raid filter",
        "sourceUrl": URL,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "raids": raids,
        "events": events,
    }
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated raid manifest: {len(raids)} raids, {len(events)} events")

if __name__ == "__main__":
    main()
