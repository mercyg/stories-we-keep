import sys
import unittest
from pathlib import Path
from unittest.mock import Mock
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'huggingface'))
from cpu_fallback import recognize_with_fallback

class CpuFallbackTests(unittest.TestCase):
    def test_success_does_not_use_cpu(self):
        gpu, cpu = Mock(return_value='words'), Mock()
        self.assertEqual(recognize_with_fallback(gpu, cpu, b'wave', 'en', 5), ('words', 'gpu'))
        cpu.assert_not_called()

    def test_quota_uses_same_recording_and_language_on_cpu(self):
        for message in ['You have exceeded your ZeroGPU runs limit.', 'ZeroGPU quota exceeded']:
            cpu = Mock(return_value='ትዝታ')
            self.assertEqual(recognize_with_fallback(Mock(side_effect=RuntimeError(message)), cpu, b'wave', 'am', 60), ('ትዝታ', 'cpu'))
            cpu.assert_called_once_with(b'wave', 'am')

    def test_long_recordings_and_unrelated_errors_do_not_use_cpu(self):
        cpu = Mock()
        with self.assertRaisesRegex(ValueError, '60 seconds'):
            recognize_with_fallback(Mock(side_effect=RuntimeError('ZeroGPU quota exceeded')), cpu, b'wave', 'en', 61)
        with self.assertRaisesRegex(RuntimeError, 'model failure'):
            recognize_with_fallback(Mock(side_effect=RuntimeError('model failure')), cpu, b'wave', 'en', 5)
        cpu.assert_not_called()
