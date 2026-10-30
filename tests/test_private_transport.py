import asyncio
import base64
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'huggingface'))
from private_transport import PrivateFilesMiddleware, decode_recording, browser_public_key, encrypt_result, AAD
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class PrivateTransportTests(unittest.TestCase):
    def test_only_requesting_browser_can_open_result(self):
        owner = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        encoded = base64.b64encode(owner.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)).decode()
        result = encrypt_result({'text': 'ትዝታ — fictional test'}, browser_public_key(encoded))
        wrapped = base64.b64decode(result['wrapped_key'])
        oaep = padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
        key = owner.decrypt(wrapped, oaep)
        clear = AESGCM(key).decrypt(base64.b64decode(result['iv']), base64.b64decode(result['ciphertext']), AAD)
        self.assertEqual(json.loads(clear)['text'], 'ትዝታ — fictional test')
        with self.assertRaises(ValueError):
            other.decrypt(wrapped, oaep)
        self.assertNotIn('text', result)
        self.assertNotIn('fictional', json.dumps(result))

    def test_audio_bytes_are_validated_without_any_file(self):
        self.assertEqual(decode_recording(base64.b64encode(b'voice bytes').decode()), b'voice bytes')
        for invalid in ('', '../private.wav', 'file:///tmp/recording', 'data:audio/wav;base64,AAAA'):
            with self.assertRaises(ValueError): decode_recording(invalid)
        with self.assertRaises(ValueError): browser_public_key('not a public key')

    def test_upload_file_and_stream_routes_are_blocked_before_app_runs(self):
        async def run(path, method='GET'):
            messages=[]
            async def app(scope, receive, send):
                await send({'type':'http.response.start','status':200,'headers':[]})
                await send({'type':'http.response.body','body':b'allowed'})
            await PrivateFilesMiddleware(app)({'type':'http','path':path,'method':method},None,self.sender(messages))
            return messages
        for path in ('/gradio_api/file=/tmp/gradio/known-recording.webm','/file=/tmp/private.wav','/gradio_api/stream/token','/gradio_api/upload','/gradio_api/upload_progress','//gradio_api//file=%2Ftmp%2Fprivate.wav'):
            messages=asyncio.run(run(path,'POST' if 'upload' in path else 'GET'))
            self.assertEqual(messages[0]['status'],403,path)
            self.assertNotIn(b'allowed',messages[-1]['body'])
        messages=asyncio.run(run('/gradio_api/call/transcribe_private/job'))
        self.assertEqual(messages[0]['status'],200)
        self.assertIn((b'cache-control',b'no-store'),messages[0]['headers'])

    @staticmethod
    def sender(messages):
        async def send(message): messages.append(message)
        return send

if __name__ == '__main__': unittest.main()
