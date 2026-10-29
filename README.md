# Stories We Keep

A bilingual family storybook for older people to pass memories to their families in Amharic and English. Record or upload audio, review the original transcript, translate it, and export a self-contained keepsake with its audio embedded.

## Create a picture storybook (no paid service)

Open a saved story or the written example and choose **Create my storybook**. The app splits the original text and optional translation into editable pages without rewriting the transcript. Edit the cover, add a dedication, then select each page to add a photo/illustration and caption. Images are resized locally; no image-generation API is called. Add at least one picture before exporting the book. You can save an unfinished draft before adding pictures.

**Save storybook** stores the book with its memory in this browser. **Download digital book** creates a portable HTML book with pictures and any original recording embedded. **Print / Save PDF** opens a printable A5 book; use its print button and choose Save as PDF. PDFs include text and pictures, not playable audio. Long manually edited pages may continue onto another printed page; use Add a page to distribute text.

Transcription, translation, and automatic AI illustrations are not connected to a hosted service. The project has a strict $0 budget; Render is not connected. See PROJECT_PLAN.md for the free-hosting work still needed.

Run the text-preservation/export checks with `node --test tests/book-template.test.mjs`.

## Deploy the frontend to Vercel first

This repository is ready for a static Vercel deployment. The Python/model backend is intentionally separate and is **not connected yet**.

1. Import this GitHub repository in Vercel.
2. Keep the root directory at the repository root. Framework preset: **Other**. The included `vercel.json` sets the output directory to `dist` and skips installation/builds.
3. Deploy. No environment variables or paid model API keys are needed for this frontend stage.
4. Verify recording/upload, written memories, local saving, search, and keepsake downloads. Transcription/translation will show an honest unavailable message until the backend is connected.

### Connect a free model backend later

1. Deploy the included Python backend on a model-capable Render service. The root Dockerfile is for this backend, not Vercel. Do not enable paid compute under the current $0 budget. Confirm a genuinely free eligible service before deployment. Render is only an optional future hosting choice, not a prerequisite for the storybook editor.
2. Set `ALLOWED_ORIGINS` to the final Vercel production origin; avoid wildcard CORS. Decide how public API requests will be authenticated/rate-limited before opening inference to visitors. Never embed a shared secret in public frontend files.
3. Set the public `backendUrl` value in `dist/config.js` to the HTTPS backend origin and redeploy Vercel. Existing saved Connection settings override this default; clear/update them when testing an older installation.
4. Validate real Amharic and English recordings through the deployed frontend. Translation separately needs Ollama or a separately integrated open-model inference service; deploying the speech backend alone does not start Ollama.

Visitors should not install Python, Ollama, or configure localhost. Local execution below is an optional developer/self-hosted mode.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the preserved scope and remaining submission work.

## Run locally

Prerequisites: Python 3.10+, ffmpeg, and Ollama (for translation only).

```bash
# macOS: brew install ffmpeg
./start.sh
```

Open http://localhost:8000. In **Connection**, enter `http://localhost:8000`, choose a model actually installed in your Ollama (`ollama list`), and test the connection. Ollama normally runs at `http://127.0.0.1:11434`. Any model name shown by Ollama can be selected; Amharic quality varies and must be reviewed. The default name is a starting configuration, not a claim of validated Amharic translation.

To run with different settings, export environment variables before starting. `.env.example` documents them; the script does not automatically load `.env` files.

## Open models

- Amharic transcription: [`b1n1yam/shook-tiny-amharic-600hr`](https://huggingface.co/b1n1yam/shook-tiny-amharic-600hr), an Amharic fine-tune of Whisper Tiny, Apache-2.0. Downloads on first transcription, then runs locally on CPU. Override `AMHARIC_MODEL` to compare compatible Whisper checkpoints.
- English transcription: [`openai/whisper-small.en`](https://huggingface.co/openai/whisper-small.en), Apache-2.0 on the Hugging Face checkpoint. The larger default prioritizes transcription quality over the earlier Tiny English configuration and needs more memory/CPU time. Override `ENGLISH_MODEL` as needed; existing environment overrides still take precedence.
- Translation: your selected downloadable Ollama language model. Its own license applies; Ollama is the runner. We have not established quality on real Amharic family recordings for this particular pipeline.

Audio processing does not call Addis AI's hosted API. Voice Lab and these downloaded weights are different deployments; their accuracy should not be assumed identical.

## What works without a backend

The web interface records audio, accepts uploads, lets you write/edit stories and translations, saves stories with audio to IndexedDB, searches/filters the storybook, opens the written fictional example, and exports an offline HTML keepsake with embedded audio. AI transcription/translation require a connected backend. There are no fake AI responses or automatic fabricated transcripts.

## Data and privacy

Stories are stored in this browser's IndexedDB, not synced or backed up to a cloud database. Clearing browser data removes them. **Download keepsake** saves a standalone HTML file containing the original audio and both texts. Keep that file as a backup; it can be opened offline.

When you click **Transcribe**, the recording is sent to your configured backend. When you click **Translate**, its text is sent to that backend and then to its configured Ollama. The Python backend deletes temporary uploaded files, does not persist audio/transcripts, and does not log successful request bodies. Initial model downloads require internet; once cached, inference can run locally. External fonts are optional presentation assets and fall back to system fonts offline.

The example is a written fictional memory with an illustrative Amharic translation. Synthetic demo audio was removed from the interface. Real recordings are kept unmodified; Whisper transcribes audio and does not generate a voice.

## Hosting

A static host such as Vercel hosts the web interface only; Cloudflare Workers cannot run this Python/PyTorch model service. The included Dockerfile runs the full app on a suitable Python/container host. For deployment:

1. Provision enough CPU/RAM for your selected model; Whisper Small English uses more resources than Tiny, and model capacity has not been benchmarked for concurrent users.
2. Set `API_TOKEN` and `ALLOWED_ORIGINS` to your actual frontend origin. Put Ollama on the same machine or a private network via `OLLAMA_URL`.
3. Keep model caches on persistent storage to avoid downloading them on each restart. Models and hosting costs are separate.
4. Serve the backend over HTTPS for a hosted frontend. Do not expose Ollama directly to the public internet. Add authentication, per-user authorization/rate limiting before a public launch.
5. In the web app, enter the backend URL, access key, and installed translation model. The key is held in tab-session storage. A hosted page connecting to localhost may require local-network permission; the fully local URL avoids that issue.

No server has been rented and no paid API service is connected by this project.

## Limits

One voice at a time; 5-minute/30 MB uploads. Names, dates, dialects, and translation can be wrong. Review the transcript before translating; keep original audio. Save operations persist locally; individual deletes are permanent after confirmation. No account system, cloud family sharing, diarization, or automatic AI follow-up questions in this first version.

## License

App code: MIT (see LICENSE). Model weights retain their respective upstream licenses and attribution requirements.
