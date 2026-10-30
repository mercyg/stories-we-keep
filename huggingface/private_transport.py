"""No file cache: memory-only audio input and browser-bound encrypted results."""
import base64
import binascii
import json
import os
from urllib.parse import unquote
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAX_BYTES = 30 * 1024 * 1024
AAD = b'swk-transcript-v1'

def decode_recording(payload):
    if not isinstance(payload, str) or not payload or len(payload) > ((MAX_BYTES + 2) // 3) * 4:
        raise ValueError('Use a recording smaller than 30 MB.')
    try:
        data = base64.b64decode(payload, validate=True)
    except (ValueError, binascii.Error):
        raise ValueError('The recording encoding is invalid.') from None
    if not data or len(data) > MAX_BYTES:
        raise ValueError('Use a nonempty recording smaller than 30 MB.')
    return data

def browser_public_key(encoded):
    if not isinstance(encoded, str) or len(encoded) > 4096:
        raise ValueError('A valid browser encryption key is required.')
    try:
        key = serialization.load_der_public_key(base64.b64decode(encoded, validate=True))
    except (ValueError, TypeError, binascii.Error):
        raise ValueError('A valid browser encryption key is required.') from None
    if not isinstance(key, rsa.RSAPublicKey) or key.key_size not in (2048, 3072, 4096):
        raise ValueError('A valid browser encryption key is required.')
    return key

def encrypt_result(result, public_key):
    key = AESGCM.generate_key(bit_length=256)
    iv = os.urandom(12)
    ciphertext = AESGCM(key).encrypt(iv, json.dumps(result, ensure_ascii=False).encode(), AAD)
    wrapped = public_key.encrypt(key, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    enc = lambda value: base64.b64encode(value).decode('ascii')
    return {'v': 1, 'algorithm': 'RSA-OAEP-256+A256GCM', 'wrapped_key': enc(wrapped), 'iv': enc(iv), 'ciphertext': enc(ciphertext)}

class PrivateFilesMiddleware:
    """Disable Gradio upload and file-serving routes, including legacy aliases."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        path = scope.get('path', '')
        for _ in range(2):
            path = unquote(path)
        path = '/' + '/'.join(part for part in path.split('/') if part)
        forbidden = ('/gradio_api/file', '/gradio_api/stream', '/gradio_api/upload', '/gradio_api/proxy', '/file=', '/stream/', '/upload')
        if scope['type'] == 'http' and any(path.startswith(prefix) for prefix in forbidden):
            await send({'type': 'http.response.start', 'status': 403, 'headers': [(b'content-type', b'application/json'), (b'cache-control', b'no-store'), (b'access-control-allow-origin', b'*')]})
            await send({'type': 'http.response.body', 'body': b'{"detail":"File uploads and downloads are disabled."}'})
            return
        async def private_send(message):
            if message['type'] == 'http.response.start' and ('/gradio_api/call/' in path or '/gradio_api/queue/' in path):
                headers = [(k,v) for k,v in message.get('headers', []) if k.lower() not in (b'cache-control', b'pragma')]
                message = {**message, 'headers': headers + [(b'cache-control', b'no-store'), (b'pragma', b'no-cache')]}
            await send(message)
        await self.app(scope, receive, private_send)
