"""PRD Cache Service

Caching layer for PRD generation using Redis for server-side caching
and providing utilities for client-side localStorage caching.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from datetime import timedelta

if TYPE_CHECKING:
    import redis  # type: ignore[import-untyped]

logger = logging.getLogger("prd_cache")


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# REDIS CLIENT
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class PRDCache:
    """
    Redis-based caching for PRD generation.
    
    Cache layers:
    - Embeddings: 24h TTL
    - Templates: 7d TTL  
    - Jira/Confluence responses: 5min TTL
    - Template fragments: 1h TTL
    """
    
    # TTL constants
    EMBEDDING_TTL = 86400  # 24 hours
    TEMPLATE_TTL = 604800  # 7 days
    JIRA_TTL = 300  # 5 minutes
    CONFLUENCE_TTL = 300  # 5 minutes
    FRAGMENT_TTL = 3600  # 1 hour
    DRAFT_TTL = 604800  # 7 days
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize cache with Redis connection.
        
        Supports two connection methods:
        1. Direct host/port/password via environment variables (preferred for Redis Cloud)
        2. Redis URL via REDIS_URL environment variable
        
        Args:
            redis_url: Redis connection URL. If not provided, uses env vars.
        """
        self.redis: Optional[redis.Redis[str]] = None
        self._connected = False
        
        try:
            import redis as redis_lib  # type: ignore[import-untyped]
            
            # Try direct connection first (Redis Cloud)
            redis_host = os.getenv("REDIS_HOST")
            redis_port = int(os.getenv("REDIS_PORT", "6379"))
            redis_password = os.getenv("REDIS_PASSWORD")
            redis_username = os.getenv("REDIS_USERNAME", "default")
            
            if redis_host and redis_password:
                self.redis = redis_lib.Redis(
                    host=redis_host,
                    port=redis_port,
                    decode_responses=True,
                    username=redis_username,
                    password=redis_password,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                )
                # Test connection
                self._get_client().ping()
                self._connected = True
                logger.info(f"PRD Cache connected to Redis Cloud at {redis_host}:{redis_port}")
            else:
                # Fallback to URL-based connection
                redis_url = redis_url or os.getenv("REDIS_URL")
                if redis_url:
                    self.redis = redis_lib.from_url(
                        redis_url,
                        decode_responses=True,
                        socket_timeout=5,
                        socket_connect_timeout=5,
                    )
                    # Test connection
                    self._get_client().ping()
                    self._connected = True
                    logger.info("PRD Cache connected to Redis via URL")
                else:
                    logger.info("No Redis configuration found. Caching disabled.")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Caching disabled.")
            self.redis = None
    
    @property
    def is_connected(self) -> bool:
        """Check if Redis is connected."""
        return self._connected and self.redis is not None
    
    def _get_client(self) -> Any:
        """Get Redis client with type assertion for type checker.
        
        Caller must check is_connected before calling.
        """
        assert self.redis is not None, "Redis not connected"
        return self.redis
    
    def _hash_key(self, text: str) -> str:
        """Generate a short hash for cache keys."""
        return hashlib.sha256(text.encode()).hexdigest()[:16]
    
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # EMBEDDING CACHE
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    async def get_embedding(self, text: str) -> Optional[List[float]]:
        """
        Get cached embedding vector.
        
        Args:
            text: The text that was embedded
            
        Returns:
            Embedding vector if cached, None otherwise
        """
        if not self.is_connected:
            return None
        
        try:
            key = f"embed:{self._hash_key(text)}"
            cached = self._get_client().get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Failed to get embedding from cache: {e}")
        
        return None
    
    async def set_embedding(self, text: str, vector: List[float], ttl: Optional[int] = None) -> bool:
        """
        Cache an embedding vector.
        
        Args:
            text: The text that was embedded
            vector: The embedding vector
            ttl: Time to live in seconds (default: 24h)
            
        Returns:
            True if cached successfully
        """
        if not self.is_connected:
            return False
        
        try:
            key = f"embed:{self._hash_key(text)}"
            self._get_client().setex(key, ttl or self.EMBEDDING_TTL, json.dumps(vector))
            return True
        except Exception as e:
            logger.warning(f"Failed to cache embedding: {e}")
            return False
    
    async def get_embeddings_batch(self, texts: List[str]) -> Dict[str, Optional[List[float]]]:
        """
        Get multiple embeddings in one request.
        
        Args:
            texts: List of texts to look up
            
        Returns:
            Dict mapping text hash to vector (or None if not cached)
        """
        if not self.is_connected or not texts:
            return {}
        
        try:
            keys = [f"embed:{self._hash_key(t)}" for t in texts]
            values = self._get_client().mget(keys)
            
            result = {}
            for text, value in zip(texts, values):
                hash_key = self._hash_key(text)
                result[hash_key] = json.loads(value) if value else None
            
            return result
        except Exception as e:
            logger.warning(f"Failed to get embeddings batch: {e}")
            return {}
    
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # TEMPLATE CACHE
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    async def get_template(self, version: str) -> Optional[Dict[str, Any]]:
        """
        Get cached PRD template.
        
        Args:
            version: Template version string
            
        Returns:
            Template data if cached, None otherwise
        """
        if not self.is_connected:
            return None
        
        try:
            key = f"template:{version}"
            cached = self._get_client().get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Failed to get template from cache: {e}")
        
        return None
    
    async def set_template(self, version: str, template: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """
        Cache a PRD template.
        
        Args:
            version: Template version string
            template: Template data
            ttl: Time to live in seconds (default: 7d)
            
        Returns:
            True if cached successfully
        """
        if not self.is_connected:
            return False
        
        try:
            key = f"template:{version}"
            self._get_client().setex(key, ttl or self.TEMPLATE_TTL, json.dumps(template))
            return True
        except Exception as e:
            logger.warning(f"Failed to cache template: {e}")
            return False
    
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # JIRA/CONFLUENCE CACHE
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    async def get_jira_response(self, epic_key: str) -> Optional[Dict[str, Any]]:
        """
        Get cached Jira API response.
        
        Args:
            epic_key: Jira epic key
            
        Returns:
            Cached response if available
        """
        if not self.is_connected:
            return None
        
        try:
            key = f"jira:{epic_key}"
            cached = self._get_client().get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Failed to get Jira response from cache: {e}")
        
        return None
    
    async def set_jira_response(self, epic_key: str, data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """
        Cache a Jira API response.
        
        Args:
            epic_key: Jira epic key
            data: Response data
            ttl: Time to live in seconds (default: 5min)
            
        Returns:
            True if cached successfully
        """
        if not self.is_connected:
            return False
        
        try:
            key = f"jira:{epic_key}"
            self._get_client().setex(key, ttl or self.JIRA_TTL, json.dumps(data))
            return True
        except Exception as e:
            logger.warning(f"Failed to cache Jira response: {e}")
            return False
    
    async def get_confluence_response(self, query_hash: str) -> Optional[Dict[str, Any]]:
        """
        Get cached Confluence search response.
        
        Args:
            query_hash: Hash of the search query
            
        Returns:
            Cached response if available
        """
        if not self.is_connected:
            return None
        
        try:
            key = f"confluence:{query_hash}"
            cached = self._get_client().get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Failed to get Confluence response from cache: {e}")
        
        return None
    
    async def set_confluence_response(
        self,
        query: str,
        data: Dict[str, Any],
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Cache a Confluence search response.
        
        Args:
            query: Search query
            data: Response data
            ttl: Time to live in seconds (default: 5min)
            
        Returns:
            True if cached successfully
        """
        if not self.is_connected:
            return False
        
        try:
            key = f"confluence:{self._hash_key(query)}"
            self._get_client().setex(key, ttl or self.CONFLUENCE_TTL, json.dumps(data))
            return True
        except Exception as e:
            logger.warning(f"Failed to cache Confluence response: {e}")
            return False
    
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # FRAGMENT CACHE (cross-user template sections)
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    async def get_section_fragment(
        self,
        section: str,
        context_hash: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached section fragment for reuse.
        
        Args:
            section: Section name
            context_hash: Hash of the input context
            
        Returns:
            Cached fragment if available
        """
        if not self.is_connected:
            return None
        
        try:
            key = f"fragment:{section}:{context_hash}"
            cached = self._get_client().get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Failed to get fragment from cache: {e}")
        
        return None
    
    async def set_section_fragment(
        self,
        section: str,
        context_hash: str,
        data: Dict[str, Any],
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Cache a section fragment for potential reuse.
        
        Args:
            section: Section name
            context_hash: Hash of the input context
            data: Fragment data
            ttl: Time to live in seconds (default: 1h)
            
        Returns:
            True if cached successfully
        """
        if not self.is_connected:
            return False
        
        try:
            key = f"fragment:{section}:{context_hash}"
            self._get_client().setex(key, ttl or self.FRAGMENT_TTL, json.dumps(data))
            return True
        except Exception as e:
            logger.warning(f"Failed to cache fragment: {e}")
            return False
    
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # DRAFT CACHE (server-side backup for client drafts)
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    async def save_draft(
        self,
        user_id: str,
        draft_id: str,
        data: Dict[str, Any],
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Save a PRD draft to cache.
        
        Args:
            user_id: User ID
            draft_id: Draft identifier
            data: Draft data
            ttl: Time to live in seconds (default: 7d)
            
        Returns:
            True if saved successfully
        """
        if not self.is_connected:
            return False
        
        try:
            key = f"draft:{user_id}:{draft_id}"
            draft_data = {
                **data,
                "saved_at": json.dumps({"$date": True}),
            }
            self._get_client().setex(key, ttl or self.DRAFT_TTL, json.dumps(draft_data))
            return True
        except Exception as e:
            logger.warning(f"Failed to save draft: {e}")
            return False
    
    async def get_draft(self, user_id: str, draft_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a saved PRD draft.
        
        Args:
            user_id: User ID
            draft_id: Draft identifier
            
        Returns:
            Draft data if available
        """
        if not self.is_connected:
            return None
        
        try:
            key = f"draft:{user_id}:{draft_id}"
            cached = self._get_client().get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Failed to get draft: {e}")
        
        return None
    
    async def list_drafts(self, user_id: str) -> List[str]:
        """
        List all draft IDs for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of draft IDs
        """
        if not self.is_connected:
            return []
        
        try:
            pattern = f"draft:{user_id}:*"
            keys = self._get_client().keys(pattern)
            return [k.split(":")[-1] for k in keys]
        except Exception as e:
            logger.warning(f"Failed to list drafts: {e}")
            return []
    
    async def delete_draft(self, user_id: str, draft_id: str) -> bool:
        """
        Delete a PRD draft.
        
        Args:
            user_id: User ID
            draft_id: Draft identifier
            
        Returns:
            True if deleted successfully
        """
        if not self.is_connected:
            return False
        
        try:
            key = f"draft:{user_id}:{draft_id}"
            self._get_client().delete(key)
            return True
        except Exception as e:
            logger.warning(f"Failed to delete draft: {e}")
            return False
    
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # RATE LIMITING
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    async def check_rate_limit(
        self,
        user_id: str,
        limit: int = 10,
        window_seconds: int = 3600,
    ) -> tuple[bool, int]:
        """
        Check if user is within rate limit.
        
        Args:
            user_id: User ID
            limit: Maximum requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed, current_count)
        """
        if not self.is_connected:
            return True, 0
        
        try:
            key = f"rate:prd:{user_id}"
            current = self._get_client().get(key)
            count = int(current) if current else 0
            
            if count >= limit:
                return False, count
            
            # Increment and set expiry
            pipe = self._get_client().pipeline()
            pipe.incr(key)
            pipe.expire(key, window_seconds)
            pipe.execute()
            
            return True, count + 1
        except Exception as e:
            logger.warning(f"Rate limit check failed: {e}")
            return True, 0
    
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # CACHE INVALIDATION
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    async def invalidate_jira_cache(self, epic_key: str) -> bool:
        """Invalidate cached Jira data for an epic."""
        if not self.is_connected:
            return False
        
        try:
            self._get_client().delete(f"jira:{epic_key}")
            return True
        except Exception as e:
            logger.warning(f"Failed to invalidate Jira cache: {e}")
            return False
    
    async def invalidate_template_cache(self, version: str) -> bool:
        """Invalidate cached template."""
        if not self.is_connected:
            return False
        
        try:
            self._get_client().delete(f"template:{version}")
            return True
        except Exception as e:
            logger.warning(f"Failed to invalidate template cache: {e}")
            return False
    
    async def clear_user_cache(self, user_id: str) -> int:
        """
        Clear all cache entries for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Number of keys deleted
        """
        if not self.is_connected:
            return 0
        
        try:
            patterns = [
                f"draft:{user_id}:*",
                f"rate:prd:{user_id}",
            ]
            deleted = 0
            for pattern in patterns:
                keys = self._get_client().keys(pattern)
                if keys:
                    deleted += self._get_client().delete(*keys)
            return deleted
        except Exception as e:
            logger.warning(f"Failed to clear user cache: {e}")
            return 0


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# SINGLETON INSTANCE
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

_cache_instance: Optional[PRDCache] = None


def get_prd_cache() -> PRDCache:
    """Get the singleton PRD cache instance."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = PRDCache()
    return _cache_instance


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# CACHED EMBEDDINGS HELPER
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async def get_cached_embeddings(
    texts: List[str],
    embed_fn,
) -> List[List[float]]:
    """
    Get embeddings with caching.
    
    Args:
        texts: Texts to embed
        embed_fn: Function to generate embeddings for uncached texts
        
    Returns:
        List of embedding vectors
    """
    cache = get_prd_cache()
    
    # Check cache for all texts
    cached = await cache.get_embeddings_batch(texts) if cache.is_connected else {}
    
    # Identify uncached texts
    uncached_texts = []
    uncached_indices = []
    
    for i, text in enumerate(texts):
        hash_key = cache._hash_key(text)
        if hash_key not in cached or cached[hash_key] is None:
            uncached_texts.append(text)
            uncached_indices.append(i)
    
    # Generate embeddings for uncached
    if uncached_texts:
        new_embeddings = await embed_fn(uncached_texts)
        
        # Cache new embeddings
        for text, embedding in zip(uncached_texts, new_embeddings):
            await cache.set_embedding(text, embedding)
            cached[cache._hash_key(text)] = embedding
    
    # Build result in original order
    result = []
    for text in texts:
        hash_key = cache._hash_key(text)
        result.append(cached.get(hash_key, []))
    
    return result
