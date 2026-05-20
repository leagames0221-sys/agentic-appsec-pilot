# Third-Party Attribution

## STRIDE-GPT (MIT)

Portions of `src/stages/threat-model/prompts/*.ts` are adapted from
**STRIDE-GPT** by Matthew Adams.

- Source: https://github.com/mrwadams/stride-gpt
- License: MIT
- Copyright (c) Matthew Adams

### Adapted files

- `src/stages/threat-model/prompts/owasp-llm.ts` — adapted from `threat_model.py::create_llm_stride_prompt_section()`
- `src/stages/threat-model/prompts/owasp-asi.ts` — adapted from `threat_model.py::create_agentic_stride_prompt_section()`
- `src/stages/threat-model/prompts/stride.ts` — adapted from `threat_model.py::create_threat_model_prompt()`

### Modifications

- Ported from Python to TypeScript
- Streamlit UI coupling removed (pure logic only)
- Returns `{ system, user }` pair for chat API alignment (Ollama / Claude Code CLI)
- Example JSON shortened (one entry each) — full schema enforced via `src/ir/schema.ts`

### MIT License text

```
MIT License

Copyright (c) Matthew Adams

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
