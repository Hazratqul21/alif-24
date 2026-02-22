import sys
import unittest.mock as mock

class MockSentry:
    def init(self, *args, **kwargs): pass

sys.modules['sentry_sdk'] = MockSentry()

try:
    import MainPlatform.backend.main
    print("SUCCESS: main imported successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
