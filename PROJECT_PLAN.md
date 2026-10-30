# Stories We Keep: delivery plan

Updated October 29, 2026.

## Goal

A family oral-history app for parents and grandparents to pass stories to their families in Amharic and English. Preserve original audio alongside an editable transcript; provide reviewed translations and portable keepsake downloads. Keep the approved warm peach, butter yellow, and berry design.

## Hacktoberfest Week 4

Challenge: https://dev.to/challenges/hacktoberfest-week4-2026-10-26
Theme: Ghost in the Machine, interpreted as honoring the past through family stories.
Deadline: October 31, 2026, 11:59 p.m. PDT. Writing quality is weighted most heavily. Explain the open models, their benefits, and real limitations; do not claim hosted inference is offline or that unverified translations are accurate.

## Budget and current priority

Strict $0 budget. Do not enable paid APIs, paid Render compute, or other billable inference. No paid service has been connected. Render has not been connected. The next infrastructure step is verifying free hosting eligibility, rather than assuming a credit or a free tier will run the models.

Main output: a picture storybook made from a family's memory. Every story page supports an image and caption. The first implementation uses family-supplied photos/illustrations. Automatic open-model illustrations are still required for the full envisioned experience but are not connected yet. Video is optional future work.

## Delivery order

1. GitHub source and Vercel-ready frontend: prepared.
2. Storybook editor: implemented, including cover, editable bilingual pages, page pictures/captions, local persistence, portable HTML with original audio, and browser Print / Save as PDF. This is deterministic layout, not AI story rewriting or illustration generation.
3. Free hosting: Hugging Face ZeroGPU is available and selected; no paid accounts or services. Visitors should not configure localhost. The user created ladybug11/stories-we-keep-speech with free ZeroGPU. The Gradio service is running. A 6.28-second synthetic English clip passed through the actual direct-browser client module and returned the expected words. Both speech models loaded; real Amharic audio accuracy remains to be tested.
4. Connect and test original Amharic/English transcription; verify translation separately. Existing FastAPI and Ollama integrations need an actual running service.
5. Connect a genuinely free open-weight image generation route. Test scene relevance and consistency; let the family review each picture. Label generated images as visual interpretations. Keep uploads as an alternative.
6. Validate the complete recorded-memory-to-picture-book experience with real sample recordings, then record a demo and publish the English DEV submission. Clearly disclose any unavailable features. Enter partner categories only when actually used.

## Current implementation

- Browser recording/upload and local IndexedDB story storage.
- Written memories, original transcript/translation editing, search/language filters, offline HTML keepsake export.
- Storybook editor: editable cover, dedication, original/translation pages, page images and captions, local saving, downloadable digital book, browser PDF printing.
- Free ZeroGPU Gradio transcription service in huggingface/; original FastAPI backend retained for optional self-hosting.
- Amharic: b1n1yam/shook-tiny-amharic-600hr; English: openai/whisper-small.en.
- Translation: configurable Ollama model, not hosted/quality-validated.
- Example is fictional written text with an illustrative translation. Synthetic sample audio is removed from the interface.

## Boundaries

No AI video, voice cloning, or fabricated family memories. No account system or cross-device sync in this submission version. Public frontend does not make locally saved stories public. Keep original recordings and allow correction rather than silently rewriting what someone said.

## Privacy update

Password-protected local vault and processing consent implemented. Existing plaintext stories migrate atomically only after the user sets a password. HTML/PDF downloads remain unencrypted and are labeled accordingly. Public free speech processing is not end-to-end encrypted; no claim of provider-wide deletion or independent security audit. See README privacy section for technical boundaries and tests.

## Hosted speech transport hardening

Replaced Gradio File uploads with an in-memory base64 text endpoint. Disabled file upload/download/stream/proxy routes; encrypted queued transcript results for the requesting browser using per-request public-key wrapping. Browser local-vault password is unrelated and is never sent. Model/platform access during processing remains a documented boundary. Live route-denial and successful encrypted WebM transcription verified. The copied live response contains ciphertext, another recipient key cannot decrypt it, and queued responses use no-store headers.
