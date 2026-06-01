import sys
import os
import unittest
import threading
import time

# Add the project root to the path so we can import from the 'rice' package
# This is a simplified version of the main function for testing the cache implementation
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rice.cache import _ThreadSafeCache

class TestThreadSafeCache(unittest.TestCase):

    def test_cache_operations(self):
        # Create a cache instance for testing
        cache = _ThreadSafeCache()
        
        # Test setting and getting values
        cache.set("key1", "value1")
        self.assertEqual(cache.get("key1"), "value1")
        
        # Test TTL functionality
        cache.set("key2", "value2")
        self.assertEqual(cache.get("key2"), "value2")
        
        # Test that the key expires after TTL
        cache.set("key3", "value3")
        self.assertEqual(cache.get("key3", ttl=0.1), "value3")
        time.sleep(0.2)  # Sleep to test TTL
        self.assertIsNone(cache.get("key3"))
        
        # Test keys method
        keys = cache.keys()
        self.assertIn("key1", keys)
        self.assertIn("key2", keys)
        self.assertIn("key3", keys)

if __name__ == '__main__':
    unittest.main()

from rice.cache import _ThreadSafeCache

class TestThreadSafeCache(unittest.TestCase):

    def test_cache_operations(self):
        # Create a cache instance for testing
        cache = _ThreadSafeCache()
        
        # Test setting and getting values
        cache.set("key1", "value1")
        self.assertEqual(cache.get("key1"), "value1")
        
        # Test TTL functionality
        cache.set("key2", "value2")
        self.assertEqual(cache.get("key2"), "value2")
        
        # Test that the key expires after TTL
        cache.set("key3", "value3")
        self.assertEqual(cache.get("key3", ttl=0.1), "value3")
        time.sleep(0.2)  # Sleep to test TTL
        self.assertIsNone(cache.get("key3"))
        
        # Test keys method
        keys = cache.keys()
        self.assertIn("key1", keys)
        self.assertIn("key2", keys)
        self.assertIn("key3", keys)

if __name__ == '__main__':
    unittest.main()