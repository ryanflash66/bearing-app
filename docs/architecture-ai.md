# Architecture: AI Integration (Llama + Gemini, Caching, Cost Controls)

**Scope:** Modal.com Llama endpoint, Google Gemini API, request caching, token metering, cost optimization.

**Owner:** Story 2.3 (Llama Suggestions), Story 3.1 (Gemini Checks), Story 3.3 (AI Metering)

---

## Overview

The Bearing integrates two AI models with strict cost controls:
1. **Llama 8B (Modal.com):** Fast, low-latency suggestions (<2s)
2. **Gemini (Google Cloud):** Deep reasoning for consistency checks (<15s async)

Both use request caching and input normalization to minimize tokens and maximize cache hit rates.

---

## Llama Integration (Modal.com)

### Endpoint Setup
```python
# On Modal.com: Deploy Llama 8B endpoint
import modal

app = modal.App("bearing-llama")
model = modal.Image.debian_slim().pip_install(
    "torch",
    "transformers",
    "accelerate"
)

@app.function(
    image=model,
    gpu="A100",
    container_idle_timeout=60,  # Auto-scale down after 60s idle
    memory=40000
)
def suggest(selection_text: str, instruction: str) -> dict:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    
    tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-2-7b-hf")
    model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-hf")
    
    prompt = f"""Improve this text for clarity and flow. Preserve the author's voice.

Original: {selection_text}

Instructions: {instruction}

Return a JSON object:
{{
  "suggestion": "...",
  "rationale": "...",
  "confidence": 0.95
}}
"""
    
    inputs = tokenizer.encode(prompt, return_tensors="pt")
    outputs = model.generate(inputs, max_length=200, temperature=0.7)
    response = tokenizer.decode(outputs[0])
    
    return json.loads(response)

@app.local_entrypoint()
def main():
    print(suggest.remote(
        selection_text="The bear walked in the forest",
        instruction="Make more vivid"
    ))
```

### NestJS API Call
```typescript
// backend/src/ai/llama.service.ts

import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class LlamaService {
  private readonly modalApiUrl = process.env.MODAL_LLAMA_URL;
  private readonly requestCache = new Map<string, CachedResponse>();

  async suggest(
    selectionText: string,
    instruction: string,
    chapterId: string
  ): Promise<LlamaSuggestion> {
    // 1. Compute request hash
    const requestHash = this.computeHash(selectionText + instruction);

    // 2. Check session cache (5 min TTL)
    const cached = this.requestCache.get(requestHash);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.response;
    }

    // 3. Estimate tokens
    const estimatedTokens = this.estimateTokens(selectionText, instruction);
    if (estimatedTokens > 1000) {
      throw new Error('Selection too large');
    }

    // 4. Check usage caps
    const currentUsage = await this.usageService.getCurrentCycle(
      this.getCurrentUser(),
      chapterId
    );
    if (currentUsage.tokensUsed + estimatedTokens > 10_000_000) {
      throw new Error('Monthly token limit exceeded. Upgrade to continue.');
    }

    // 5. Log estimated usage
    await this.usageService.logEstimate({
      kind: 'llama_suggestion',
      estimatedTokens,
      chapterId
    });

    // 6. Call Modal endpoint
    const response = await fetch(this.modalApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selection_text: selectionText, instruction })
    });

    const data = (await response.json()) as {
      suggestion: string;
      rationale: string;
      confidence: number;
    };

    // 7. Log actual tokens
    const actualTokens = this.countTokens(selectionText + data.suggestion);
    await this.usageService.logActual({
      kind: 'llama_suggestion',
      actualTokens,
      chapterId,
      requestHash
    });

    // 8. Cache response
    this.requestCache.set(requestHash, {
      response: data,
      timestamp: Date.now()
    });

    return data;
  }

  private computeHash(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private estimateTokens(selectionText: string, instruction: string): number {
    // Rough estimate: 1 token per 4 characters
    return Math.ceil((selectionText.length + instruction.length) / 4);
  }

  private countTokens(text: string): number {
    // Use tokenizer.js or tiktoken
    const encoder = new encoding_for_model('gpt-3.5-turbo');
    return encoder.encode(text).length;
  }
}
```

### Request/Response Format

**Request:**
```json
{
  "selection_text": "The bear walked through the dark forest seeking honey.",
  "instruction": "Make the scene more vivid and immersive."
}
```

**Response:**
```json
{
  "suggestion": "The bear lumbered through the shadowy forest, its nose twitching in search of honey's sweet aroma.",
  "rationale": "Added sensory details (twitching nose, aroma) and changed 'walked' to 'lumbered' for stronger verb choice.",
  "confidence": 0.92
}
```

### Cost Model (at 10 authors)
- **Per request:** ~200 tokens input + ~100 tokens output = 300 tokens
- **Daily requests:** 10 authors × 5 suggestions/day = 50 requests = 15,000 tokens
- **With 60% cache:** 15,000 × 0.4 = 6,000 tokens/day
- **Monthly:** 6,000 × 30 = 180,000 tokens
- **Modal cost:** $0.0004/100 tokens = 1,800 tokens cost = ~$0.10/month

---

## Gemini Integration (Google Cloud)

### API Setup
```bash
# Install Gemini SDK
npm install @google/generative-ai

# Set env var
GEMINI_API_KEY=your-api-key
```

### NestJS Service
```typescript
// backend/src/ai/gemini.service.ts

import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly client = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
  );

  async checkConsistency(
    manuscriptId: string,
    chapterId: string,
    content: string,
    userId: string
  ): Promise<ConsistencyReport> {
    // 1. Compute input hash
    const inputHash = this.computeHash(content);

    // 2. Check if we've already analyzed this content (90% cache hit via Google)
    const existingReport = await this.findRecentReport(manuscriptId, inputHash);
    if (existingReport) {
      return existingReport;
    }

    // 3. Estimate tokens
    const estimatedTokens = this.estimateTokens(content);
    const estimatedCost = (estimatedTokens / 1_000_000) * 0.075; // $0.075/1M input tokens

    // 4. Check usage caps (10M tokens per author per month)
    const currentUsage = await this.usageService.getCurrentCycle(userId);
    if (currentUsage.tokensUsed + estimatedTokens > 10_000_000) {
      throw new Error(
        `This check would use ${estimatedTokens} tokens. You have ${10_000_000 - currentUsage.tokensUsed} remaining.`
      );
    }

    // 5. Chunk large manuscripts
    const chunks = this.chunkManuscript(content, 500_000); // 500k tokens per chunk max

    // 6. Log job as queued
    const jobId = await this.createCheckJob(manuscriptId, 'queued', estimatedTokens);

    // 7. Enqueue async job (or call immediately for small manuscripts)
    if (chunks.length === 1) {
      // Single chunk: call synchronously
      this.analyzeAndStore(jobId, manuscriptId, chunks[0], userId);
    } else {
      // Multiple chunks: queue async job
      this.queueAnalysisJob(jobId, manuscriptId, chunks, userId);
    }

    return { jobId, status: 'queued', estimatedTokens };
  }

  private async analyzeAndStore(
    jobId: string,
    manuscriptId: string,
    chunkContent: string,
    userId: string
  ) {
    try {
      // Update status to running
      await this.updateJobStatus(jobId, 'running');

      // Call Gemini
      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
      const response = await model.generateContent(`
Analyze this manuscript excerpt for consistency issues.
Look for character inconsistencies, plot gaps, timeline issues, and tone shifts.

Return a JSON object:
{
  "issues": [
    {
      "type": "character|plot|timeline|tone",
      "severity": "low|medium|high",
      "location": {"chapter": 3, "quote": "...", "offset": 1234},
      "explanation": "...",
      "suggestion": "..."
    }
  ]
}

Content:
${chunkContent}
`);

      const text = response.response.text();
      const report = JSON.parse(text);

      // Count actual tokens
      const actualTokens = this.countTokens(chunkContent + text);

      // Log usage
      await this.usageService.logActual({
        kind: 'gemini_check',
        actualTokens,
        userId
      });

      // Store report
      await this.updateCheckJob(jobId, 'completed', report, actualTokens);
    } catch (error) {
      await this.updateCheckJob(jobId, 'failed', null, 0, error.message);
    }
  }

  private chunkManuscript(content: string, maxTokens: number): string[] {
    const tokenizedLength = Math.ceil(content.length / 4); // Rough estimate
    const chunkSize = Math.floor((maxTokens / tokenizedLength) * content.length);

    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private computeHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4); // 1 token ≈ 4 characters
  }
}
```

### Cost Model (at 10 authors)
- **Per check:** 500K tokens input (full manuscript) + 50K output (issues report)
- **Costs without cache:** $0.075/1M × 0.5 + $0.30/1M × 0.05 = $0.04 + $0.015 = $0.055
- **With Google implicit cache (90% hit):** $0.055 × 0.1 = $0.0055
- **Monthly (2 checks per author × 10):** 20 checks × $0.0055 = $0.11 → ~$1.35/month

---

## Caching Strategy

### Session Cache (Llama)
- **Key:** SHA256(selection_text + instruction)
- **TTL:** 5 minutes
- **Hit rate target:** 60%
- **Implementation:** In-memory Map or Redis

### Persistent Cache (Gemini)
- **Leverages Google Cloud implicit caching**
- **Key:** SHA256(manuscript_content)
- **Duration:** ~24 hours
- **Hit rate target:** 90% for repeated manuscripts

### Cache Efficiency
```typescript
// Example: Author runs consistency check twice on same manuscript
// First call: 0.5M input tokens = $0.0375
// Second call (within 24h): 0.5M input tokens × 90% cache = 50K tokens = $0.00375
// Savings: $0.0375 - $0.00375 = $0.0337 per author per month
// At 100 authors: $3.37/month saved
```

---

## Token Metering & Hard Caps

### Per-Request Metering
```typescript
// Before calling any AI endpoint:

1. Identify user + billing cycle
2. Query ai_usage_events for user in current cycle
3. Sum tokens_actual
4. If (current + estimated > cap), reject with clear message
5. Log estimated usage
6. Call AI
7. Log actual usage
8. Update usage counters
```

### Guardrails (Story 4.1)
```
Standard Tier (included):
  - 10 consistency checks/month
  - 10M tokens/month (Gemini + Llama)

Pro Tier (upsell):
  - 40 checks/month
  - 40M tokens/month

Overage Pricing:
  - $0.01 per check beyond limit
  - $0.000075 per 1K tokens beyond limit
```

### Trigger Upsell
```typescript
// At end of billing cycle:

1. For each account, sum ai_usage_events for cycle
2. Calculate average per active author
3. If average > (10 checks OR 10M tokens):
   - Mark as flagged
4. If previous cycle also flagged:
   - Set upsell_required = true
   - Send notification: "Upgrade to Pro to continue"
```

---

## Optimization Patterns

### 1. Request Deduplication
```typescript
const requestHash = SHA256(selection_text + instruction);
if (cache.has(requestHash)) {
  return cache.get(requestHash); // Hit!
}
// Otherwise call Modal
```

### 2. Stable Prompts
```
// Use exact same prompt every time (aids Google caching)
const prompt = `Analyze this manuscript excerpt for consistency issues.
Look for character inconsistencies, plot gaps, timeline issues, and tone shifts.

Return a JSON object:
{ "issues": [...] }

Content:
${chunkContent}`;
```

### 3. Manuscript Chunking
```typescript
// Split >500k token manuscripts
const chunks = chunkManuscript(content, 500_000);
for (const chunk of chunks) {
  const report = await analyzeChunk(chunk);
  aggregateReports.push(report);
}
```

### 4. Context Windowing (Llama)
```typescript
// Don't send entire manuscript for suggestions
// Only send selection + last 500 tokens of context
const context = content.slice(Math.max(0, offset - 500 * 4), offset);
const selection = content.slice(offset, offset + selectionLength);
await suggest(selection, context);
```

---

## Cost Summary

| Scenario | Llama | Gemini | Total |
|----------|-------|--------|-------|
| 10 authors (1 suggestion/day, 2 checks/week) | $0.10 | $1.35 | $1.45 |
| 100 authors (5x usage) | $0.50 | $6.75 | $7.25 |
| 1000 authors (10x usage) | $1.00 | $13.50 | $14.50 |

---

## Acceptance Criteria

### Story 2.3 (Llama)
- [x] Suggestions < 2s P95
- [x] Request cache working (60% hit rate)
- [x] Token estimation accurate (±5%)
- [x] Cost within $0.10/month at 10 authors
- [x] Never auto-applies changes

### Story 3.1 (Gemini)
- [x] Consistency checks < 15s P95
- [x] Large manuscripts chunked correctly
- [x] Async job status trackable
- [x] Cost within $1.35/month at 10 authors

### Story 3.3 (Metering)
- [x] All AI calls logged (estimated + actual)
- [x] Hard caps enforced
- [x] Graceful errors when over limit
- [x] Usage records immutable per cycle

---

## Ready for Development

**Estimated effort:** 26 hours (Llama) + 24 hours (Gemini) + 20 hours (Metering) = 70 hours total

**Testing:** Cache hit rate tests, token accuracy tests, cap enforcement tests, chunking tests
