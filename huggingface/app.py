"""Free ZeroGPU speech service. Run with Gradio; no paid inference API."""
import os
os.environ['GRADIO_ANALYTICS_ENABLED'] = 'False'
import spaces  # Must be imported before torch for ZeroGPU.
import subprocess
from pathlib import Path
import gradio as gr
import numpy as np
import torch
from transformers import pipeline

MODELS = {'am': 'b1n1yam/shook-tiny-amharic-600hr', 'en': 'openai/whisper-small.en'}
# Place models on CUDA at startup as required by ZeroGPU's CUDA emulation.
PIPES = {lang: pipeline('automatic-speech-recognition', model=model,
    device='cuda:0', dtype=torch.float16) for lang, model in MODELS.items()}

def decode(path):
    if not path or not Path(path).is_file():
        raise gr.Error('Please record or upload an audio file.')
    if Path(path).stat().st_size > 30 * 1024 * 1024:
        raise gr.Error('Please use a recording smaller than 30 MB.')
    try:
        result = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', path,
            '-t', '301', '-f', 'f32le', '-ar', '16000', '-ac', '1', 'pipe:1'],
            capture_output=True, timeout=35, check=False)
    except (subprocess.TimeoutExpired, FileNotFoundError):
        raise gr.Error('The recording could not be decoded. Try WAV, MP3, M4A or WebM.')
    if result.returncode or not result.stdout:
        raise gr.Error('This file could not be decoded as audio.')
    wave = np.frombuffer(result.stdout, dtype=np.float32).copy()
    seconds = len(wave) / 16000
    if not 0.3 <= seconds <= 300:
        raise gr.Error('Use a recording between one second and five minutes.')
    if not np.isfinite(wave).all() or float(np.sqrt(np.mean(wave ** 2))) < 0.0002:
        raise gr.Error('This recording is silent or too quiet. Please record closer to the microphone.')
    return wave, seconds

@spaces.GPU(duration=60)
def recognize(wave, language):
    options = {'language': 'amharic', 'task': 'transcribe'} if language == 'am' else {}
    with torch.inference_mode():
        result = PIPES[language]({'raw': wave, 'sampling_rate': 16000},
            chunk_length_s=25, stride_length_s=4, generate_kwargs=options)
    return str(result.get('text', '')).strip()

def transcribe(audio, language):
    if language not in MODELS:
        raise gr.Error('Choose English or Amharic.')
    try:
        wave, seconds = decode(audio)
        text = recognize(wave, language)
        if not text:
            raise gr.Error('No speech was recognized. Try a clearer recording.')
        return {'text': text, 'language': language, 'duration': round(seconds, 2),
                'model': MODELS[language], 'review_required': True}
    finally:
        # Gradio owns this uploaded temporary file. Remove it after processing.
        if audio:
            Path(audio).unlink(missing_ok=True)

with gr.Blocks(title='Stories We Keep — Speech', delete_cache=(60, 60)) as demo:
    gr.Markdown('# Stories We Keep\nEnglish and Amharic transcription for family memories.\n\n'
        'Audio is sent to this Hugging Face Space for processing. Uploaded audio is deleted '
        'after processing; review the transcript before keeping it. Free GPU queues and quotas apply. '
        'Translation and image generation are not provided by this service.')
    audio = gr.File(label='Recording (up to 5 minutes / 30 MB)', type='filepath', file_types=['audio'])
    language = gr.Dropdown(choices=[('አማርኛ', 'am'), ('English', 'en')], value='am', label='Original language')
    submit = gr.Button('Transcribe recording', variant='primary')
    output = gr.JSON(label='Transcript — please review')
    submit.click(transcribe, [audio, language], output, api_name='transcribe', concurrency_limit=1)
    gr.Markdown('Open models: [Addis AI Shook Tiny](https://huggingface.co/b1n1yam/shook-tiny-amharic-600hr) '
        'and [Whisper Small English](https://huggingface.co/openai/whisper-small.en). '
        '[Source](https://github.com/mercyg/stories-we-keep).')

demo.queue(max_size=8).launch(max_file_size='30mb', show_error=True)
