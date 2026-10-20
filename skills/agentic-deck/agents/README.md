# Agents

| File | Role | Reads | Decides |
|---|---|---|---|
| `orchestrator.md` | Managing Partner: runs the loop, audits reviewers, arbitrates, applies fixes | everything | what changes, when to stop |
| `design.md` | Design Director | slide images, design-system.md, exemplars | layout, hierarchy, balance, finish |
| `less-text.md` | Density Editor ("less text") | slides.json, images | words → elements, paragraphs, dead space |
| `minimal.md` | Minimalist | images, qa.json | colour, decoration, eyebrows, glyphs, type sizes |
| `elements.md` | Elements Architect ("loads of elements") | images, plan.md, brief.json | element variety and fit, logos, icons, charts not tables |
| `integrity.md` | Integrity Auditor | slides.json, notes, sources, appendix | every number sourced, consistent, robust, defensible |
| `headlines.md` | Headline Editor | titles.md, headlines.md | four tests, read-aloud story |
| `style.md` | Style Guard ("no em dashes and what not") | slides.json, notes, file metadata | dashes, hype, AI tells, voice, exclusions |
| `layout.md` | Layout QA | images, qa.json | overflow, overlap, alignment, rounded corners, furniture |
| `mbb-council.md` | Five MBB Senior Partner judges + chairman | the whole pack | the verdict and the one change that matters most |

## Running them

**Claude Code (Agent tool):** spawn the eight specialists in ONE message so they run in parallel. Use `subagent_type: "general-purpose"` and this prompt shape:

```
You are the <Role> on an agentic deck review. Your full brief is in <SKILL>/agents/<name>.md: read it first and follow it exactly.
Review pack: <deck dir>/review/r<N>/ (slides/NN.jpg, contact.jpg, slides.json, qa.json, titles.md)
Brief: <deck dir>/brief.json   Plan: <deck dir>/plan.md   Skill references: <SKILL>/references/
Round <N>. Previous round's fixes: <deck dir>/review/r<N-1>/fixes.md (if any).
Return ONLY the JSON object described in your brief.
```

**Native subagents:** copy `agents/*.md` (except this README and `orchestrator.md`) into the project's `.claude/agents/`. The frontmatter (`name`, `description`, `tools`) makes them selectable as `subagent_type: "<name>"`, e.g. `deck-design`.

**No subagent tool (claude.ai chat):** run each brief as its own pass, write the JSON to `review/rN/<name>.json`, then start the next. Do not let an earlier review's text into a later reviewer's pass.

## Output schema (every specialist)

```json
{
  "agent": "design",
  "round": 1,
  "score": 7.5,
  "verdict": "fix",                       // "pass" (score >= 8 and no blocking issue) or "fix"
  "strengths": ["S4: three-panel rhythm reads in seconds", "..."],
  "issues": [
    {
      "slide": 3,
      "severity": "blocking",             // blocking | major | minor
      "where": "bottom strip, right callout",
      "problem": "insight text at 9.5pt is the only body copy below 11pt; reads as a footnote",
      "fix": "raise to 11pt and cut 'counts sales that would happen anyway' to 'buys sales we'd get anyway'",
      "effort": "quick"                   // quick | medium | rebuild
    }
  ],
  "slide_scores": { "2": 8, "3": 7 }
}
```

Rules for every reviewer: cite slide numbers; every fix is concrete enough to implement without asking (words, sizes, positions, element names); no more than 12 issues, ranked; do not repeat qa.py findings unless you disagree with them; score with the rubric in your brief, and justify any 9 or 10 with evidence; list strengths first so fixes don't destroy them.
