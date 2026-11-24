# Options Desk Manual

An interactive options-trading course, published as a Claude artifact: https://claude.ai/artifact/YbkMTSvJfwhtvon2ouuBXe

- `CONTEXT.md`: domain vocabulary. `docs/course-plan.md`: what the course covers. `docs/adr/`: design decisions.
- `docs/authoring.md`: how to write Lessons (format, computed numbers, Tools, Quizzes, Scenario Exercises).
- `content/`: Lessons (Markdown) and the Glossary. `src/lib/`: the pricing library every number comes from. `src/app/`: the page and the seven Tools.

```bash
npm install
npm test            # pricing library tests
npm run build       # content + app -> dist/, fails on any content problem
npm run build -- --only core-03   # check one Module while writing
```

Publish by publishing `dist/index.html` with every other file in `dist/` as a supporting file, to the same artifact URL.
