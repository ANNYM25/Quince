# Intake: what the user wants, written down once

The deck is built for the user, so their stated wishes on elements and design outrank this skill's defaults (except the non-negotiables in SKILL.md §7). The intake writes `brief.json`; every agent reads it and the Orchestrator checks the final deck against it.

## 1. Extract before you ask

Scan the user's message and attachments for:
- **Purpose and audience:** case competition (which rubric?), board, client readout, investor pitch, internal.
- **Structure:** required sections and order, slide count, time limit ("5-minute deck" ≈ 7 core slides + appendix).
- **Element wishes:** "process chart not a table", "logos", "icons", "Gantt", "funnel", "2x2", "screenshots with captions", "flowchart", "heatmap", "maps".
- **Design wishes:** colours, font, "no eyebrows", "rounded corners", "dark cover", "less colourful", "more whitespace" or "less whitespace", a reference deck to match.
- **Exclusions:** names that must not appear (team, school, client), topics to avoid, numbers not to use.
- **Loop preference:** default on; off if they say "no loop", "single pass", "don't loop", "just build it".

## 2. Ask only what is missing (max four questions, one message)

Use AskUserQuestion when available. Good questions have options and a recommended default:

1. **Which elements do you want most?** (multi-select) Process charts and timelines · Charts and labelled bars · Real company logos · Icon rows and journeys · Frameworks (2x2, issue tree, funnel) · Screenshots with callouts · Gantt and gates
2. **How dense?** Exhaustive-minimal (recommended: every region carries evidence, quiet styling) · Balanced · Presenter mode (few words, big numbers)
3. **Output?** PPTX + PDF + HTML viewer (recommended) · PPTX only · HTML web deck (React, animations)
4. **Review loop?** Loop with 8 reviewers and the MBB partner council until it passes (recommended) · Single pass, no loop

Never ask about the palette, font or corner style unless the user raised it; the defaults are the house style.

## 3. brief.json

```json
{
  "title": "Own the Second Purchase",
  "audience": "Case competition judges (rubric: 70 points; 7 core slides in fixed order + appendix)",
  "governing_thought": "Own the second purchase by moving up to $9M from rented to owned channels, with holdouts deciding every dollar.",
  "tag": "G27",
  "footer": "Team G27",
  "exclude_strings": ["<university name>", "<team name>"],
  "density": "exhaustive",
  "elements_wanted": ["process chart", "real logos", "labelled bars", "journey row", "Gantt"],
  "elements_banned": ["tables on core slides", "eyebrow labels", "stock photos"],
  "design_wishes": ["rounded corners", "calm two-colour palette", "council cover background"],
  "font": "Inter",
  "extra_colours": [],
  "core_slides": [2, 3, 4, 5, 6, 7],
  "required_sections": ["Executive summary", "Market", "Customer (CJA)", "Competition", "Capabilities", "Next steps"],
  "outputs": ["pptx", "pdf", "html"],
  "build_path": "pptx",
  "loop": { "enabled": true, "max_rounds": 3, "council": true },
  "logos": ["Quince=Quince (company)", "Amazon=Amazon (company)", "Shein", "Everlane", "Uniqlo"],
  "time_limit_minutes": 5
}
```

`exclude_strings` is checked by the Style agent against slide text, notes, file names and document properties. `core_slides` tells qa.py which titles must carry a number.

## 4. Mid-build requests

When the user adds a wish during the build ("make it denser", "use this background", "add logos"), update `brief.json` first, then apply it, then tell every agent in the next round that the brief changed. A newer instruction from the user beats an older one.
