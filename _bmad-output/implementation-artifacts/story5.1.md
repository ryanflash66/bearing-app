# Story 5.1: Integrate Custom Fine-Tuned Models

## Description

As the platform, I want to replace the generic "off-the-shelf" AI models (Gemini/Llama via OpenRouter) with our specialized, self-hosted fine-tuned models. This will significantly improve the quality, style adaptation, and domain specificity of the Consistency Engine and Suggestions, providing the "Intelligence Upgrade" that differentiates Bearing from generic tools.

## Acceptance Criteria (Gherkin Format)

### AC 5.1.1

- **Given:** The `AIService` is configured for production
- **When:** An author triggers a Consistency Check (Story 3.1)
- **Then:** The request is routed to our custom inference endpoint (not OpenRouter)
- **And:** The payload matches the fine-tuned model's expected schema

### AC 5.1.2

- **Given:** The inference service requires authentication
- **When:** The system connects
- **Then:** It uses secure, rotated credentials (internal service-to-service auth)

### AC 5.1.3

- **Given:** The custom model is unavailable or overloaded
- **When:** A request times out
- **Then:** The system gracefully falls back to the generic OpenRouter model (optional, depending on business rule) OR returns a specific "High Traffic" status

### AC 5.1.4

- **Given:** A "Style Analysis" is requested
- **When:** Validated against the fine-tuned model
- **Then:** The output follows the specific JSON schema trained into the model, with higher adherence than the generic model

## Dependencies

- **Epic 3:** Consistency Engine (Foundational AI infrastructure)
- **Epic 4:** Support & Admin (Admin overrides)
- **Infrastructure:** Self-hosted inference service deployed and accessible via API

## Implementation Tasks

- [ ] Update `AIService` config to support custom `baseURL` and `headers` for inference endpoints
- [ ] Implement `FineTunedAdapter` extending the base AI provider interface
- [ ] Add env vars for `CUSTOM_INFERENCE_URL` and `CUSTOM_INFERENCE_KEY`
- [ ] Validate payload/response mapping for the custom model (adjust prompts if fine-tuning removed instruction following)
- [ ] Run regression tests to ensure quality boost

## Cost Estimate

- **Inference:** Varies based on hosting (GPU hours) vs Token cost.
- **Goal:** Higher quality per request, potential higher cost per request than OpenRouter/Gemini Flash, but higher value.

## Latency SLA

- **Target:** Maintain <15s for checks, <2s for autocomplete.
- **Note:** latency depends on allocated GPU resources.

## Success Criteria (QA Gate)

- [ ] Consistency checks return valid results from custom endpoint
- [ ] No regression in application stability
- [ ] "Intelligence" quality metric shows improvement (blind test vs generic model)

## Effort Estimate

- **Dev hours:** 8 hours
- **QA hours:** 4 hours
- **Total:** 12 hours
