"""PRD Generator External Tools

Tools that provide external context to PRD generation agents.
These tools fetch data from Jira, Confluence, Slack, web search, and perform
validation tasks like duplicate detection.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
from typing import Any, Dict, List, Optional, Sequence, TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.models.prd_models import PRDInput, EnrichedContext

# Try to import function_tool from agents SDK.
# IMPORTANT: The Agents SDK decorator returns a FunctionTool object, which is NOT
# directly callable. We need these functions callable from our Python code
# (e.g., enrich_prd_context), while still allowing agent/tool registration.
try:
    from agents import function_tool as _agents_function_tool

    def function_tool(func):
        """Attach an Agents SDK FunctionTool to a callable function.

        The returned value is the original function (callable), with the tool
        instance available at func._tool.
        """

        tool = _agents_function_tool(func)
        setattr(func, "_tool", tool)
        setattr(func, "_is_tool", True)
        return func

except ImportError:
    # Fallback decorator if agents package doesn't have function_tool
    def function_tool(func):
        """Fallback decorator for function tools."""
        func._is_tool = True
        func._tool = func
        return func

logger = logging.getLogger("prd_tools")


# ═══════════════════════════════════════════════════════════════════════════════
# TOOL OUTPUT MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class JiraEpicContext(BaseModel):
    """Context fetched from a Jira epic."""
    epic_key: str
    summary: str
    description: Optional[str] = None
    status: Optional[str] = None
    labels: List[str] = Field(default_factory=list)
    child_issues: List[Dict[str, Any]] = Field(default_factory=list)
    comments: List[str] = Field(default_factory=list)
    linked_issues: List[Dict[str, Any]] = Field(default_factory=list)


class ConfluencePage(BaseModel):
    """A Confluence page result."""
    page_id: str
    title: str
    space_key: str
    excerpt: str
    url: str
    last_modified: Optional[str] = None


class ConfluenceSearchResult(BaseModel):
    """Results from Confluence search."""
    pages: List[ConfluencePage] = Field(default_factory=list)
    total_results: int = 0
    query: str = ""


class SlackThread(BaseModel):
    """A Slack thread with relevant messages."""
    channel_id: str
    channel_name: Optional[str] = None
    thread_ts: str
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    participants: List[str] = Field(default_factory=list)
    summary: Optional[str] = None


class SlackSearchResult(BaseModel):
    """Results from Slack search."""
    threads: List[SlackThread] = Field(default_factory=list)
    total_results: int = 0
    keywords: List[str] = Field(default_factory=list)


class WebSearchResult(BaseModel):
    """A web search result."""
    title: str
    url: str
    snippet: str
    source: Optional[str] = None


class WebSearchOutput(BaseModel):
    """Output from web search."""
    results: List[WebSearchResult] = Field(default_factory=list)
    query: str = ""


class DuplicateGroup(BaseModel):
    """A group of similar/duplicate requirements."""
    requirements: List[str]
    similarity_score: float
    suggested_merge: Optional[str] = None


class DuplicateCheckResult(BaseModel):
    """Result of duplicate requirement check."""
    duplicate_groups: List[DuplicateGroup] = Field(default_factory=list)
    unique_requirements: List[str] = Field(default_factory=list)
    total_checked: int = 0


class ValidationIssue(BaseModel):
    """A validation issue found in PRD section."""
    field: str
    issue: str
    severity: str  # error, warning, info
    suggestion: Optional[str] = None


class ValidationResult(BaseModel):
    """Result of PRD schema validation."""
    valid: bool
    issues: List[ValidationIssue] = Field(default_factory=list)
    section: str = ""


class CodebaseAnalysis(BaseModel):
    """Analysis of a codebase."""
    repo_url: str
    languages: List[str] = Field(default_factory=list)
    frameworks: List[str] = Field(default_factory=list)
    architecture_patterns: List[str] = Field(default_factory=list)
    existing_integrations: List[str] = Field(default_factory=list)
    tech_debt_indicators: List[str] = Field(default_factory=list)
    summary: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# JIRA TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool
async def fetch_jira_context(
    epic_key: str,
    integration_id: Optional[str] = None,
    include_children: bool = True,
    include_comments: bool = True,
    max_children: int = 20,
) -> JiraEpicContext:
    """
    Fetch epic details, child issues, and comments from Jira.
    
    Args:
        epic_key: The Jira epic key (e.g., 'PROJ-123')
        integration_id: Optional Jira integration ID for authentication
        include_children: Whether to fetch child issues
        include_comments: Whether to fetch comments
        max_children: Maximum number of child issues to fetch
        
    Returns:
        JiraEpicContext with epic details and related data
    """
    try:
        # Try to import Jira client
        from app.services.jira import JiraAPIClient, JiraOAuthManager
        from app.core.dependencies import supabase
        
        if not integration_id:
            logger.warning("No integration_id provided for Jira fetch")
            return JiraEpicContext(
                epic_key=epic_key,
                summary=f"Epic {epic_key} (no integration configured)",
                description="Unable to fetch - no Jira integration ID provided",
            )
        
        # Get integration credentials
        integration_res = supabase.table("integration_credentials").select("*").eq("id", integration_id).single().execute()
        if not integration_res.data:
            return JiraEpicContext(
                epic_key=epic_key,
                summary=f"Epic {epic_key}",
                description="Integration not found",
            )
        
        integration = integration_res.data
        workspace_id = integration.get("workspace_id", "")
        
        # Get OAuth settings from config
        from app.core.config import settings
        oauth_manager = JiraOAuthManager(
            client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
            client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value()) if settings.JIRA_OAUTH_CLIENT_SECRET else ""
        )
        access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, workspace_id)
        
        if not access_token:
            return JiraEpicContext(
                epic_key=epic_key,
                summary=f"Epic {epic_key}",
                description="Unable to get valid access token",
            )
        client = JiraAPIClient(access_token, cloud_id)
        
        epic = await client.get_issue(epic_key, fields=["summary", "description", "status", "labels"])
        
        result = JiraEpicContext(
            epic_key=epic_key,
            summary=epic.get("fields", {}).get("summary", ""),
            description=_extract_jira_description(epic.get("fields", {}).get("description")),
            status=epic.get("fields", {}).get("status", {}).get("name"),
            labels=epic.get("fields", {}).get("labels", []),
        )
        
        # Fetch children
        if include_children:
            children = await client.search_issues(
                jql=f'"Epic Link" = {epic_key} OR parent = {epic_key}',
                fields=["summary", "status", "issuetype"],
                max_results=max_children,
            )
            result.child_issues = [
                {
                    "key": c.get("key"),
                    "summary": c.get("fields", {}).get("summary"),
                    "type": c.get("fields", {}).get("issuetype", {}).get("name"),
                    "status": c.get("fields", {}).get("status", {}).get("name"),
                }
                for c in children.get("issues", [])
            ]
        
        # Fetch comments - use get_issue with comment expand
        if include_comments:
            try:
                epic_with_comments = await client.get_issue(
                    epic_key, 
                    expand=["renderedFields"],
                    fields=["comment"]
                )
                comments_field = epic_with_comments.get("fields", {}).get("comment", {})
                result.comments = [
                    _extract_jira_description(c.get("body"))
                    for c in comments_field.get("comments", [])[:10]
                ]
            except Exception as e:
                logger.warning(f"Failed to fetch comments: {e}")
        
        return result
        
    except ImportError:
        logger.warning("Jira integration not available")
        return JiraEpicContext(
            epic_key=epic_key,
            summary=f"Epic {epic_key}",
            description="Jira integration not configured",
        )
    except Exception as e:
        logger.error(f"Failed to fetch Jira context: {e}")
        return JiraEpicContext(
            epic_key=epic_key,
            summary=f"Epic {epic_key}",
            description=f"Error fetching from Jira: {str(e)[:200]}",
        )


def _extract_jira_description(description: Any) -> str:
    """Extract plain text from Jira ADF description."""
    if not description:
        return ""
    if isinstance(description, str):
        return description
    
    # Handle Atlassian Document Format
    if isinstance(description, dict) and description.get("type") == "doc":
        texts = []
        for content in description.get("content", []):
            if content.get("type") == "paragraph":
                for item in content.get("content", []):
                    if item.get("type") == "text":
                        texts.append(item.get("text", ""))
        return " ".join(texts)
    
    return str(description)[:1000]


# ═══════════════════════════════════════════════════════════════════════════════
# CONFLUENCE TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool
async def search_confluence(
    query: str,
    space_key: Optional[str] = None,
    integration_id: Optional[str] = None,
    limit: int = 5,
) -> ConfluenceSearchResult:
    """
    Search Confluence for related documentation, specs, and decisions.
    
    Args:
        query: Search query
        space_key: Optional space key to limit search
        integration_id: Atlassian integration ID
        limit: Maximum number of results
        
    Returns:
        ConfluenceSearchResult with matching pages
    """
    try:
        from app.services.jira import JiraOAuthManager
        from app.core.dependencies import supabase
        import httpx
        
        if not integration_id:
            return ConfluenceSearchResult(query=query, total_results=0)
        
        # Get integration
        integration_res = supabase.table("integrations").select("*").eq("id", integration_id).single().execute()
        if not integration_res.data:
            return ConfluenceSearchResult(query=query, total_results=0)
        
        integration = integration_res.data
        workspace_id = integration.get("workspace_id", "")
        
        # Get OAuth settings from config
        from app.core.config import settings
        oauth_manager = JiraOAuthManager(
            client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
            client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value()) if settings.JIRA_OAUTH_CLIENT_SECRET else ""
        )
        access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, workspace_id)
        
        # Build CQL query
        cql = f'text ~ "{query}"'
        if space_key:
            cql += f' AND space = "{space_key}"'
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.atlassian.com/ex/confluence/{cloud_id}/wiki/rest/api/content/search",
                params={"cql": cql, "limit": limit},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            
            if response.status_code != 200:
                return ConfluenceSearchResult(query=query, total_results=0)
            
            data = response.json()
            pages = []
            for result in data.get("results", []):
                pages.append(ConfluencePage(
                    page_id=result.get("id", ""),
                    title=result.get("title", ""),
                    space_key=result.get("space", {}).get("key", ""),
                    excerpt=result.get("excerpt", "")[:500],
                    url=result.get("_links", {}).get("webui", ""),
                ))
            
            return ConfluenceSearchResult(
                pages=pages,
                total_results=data.get("totalSize", len(pages)),
                query=query,
            )
            
    except Exception as e:
        logger.error(f"Confluence search failed: {e}")
        return ConfluenceSearchResult(query=query, total_results=0)


# ═══════════════════════════════════════════════════════════════════════════════
# SLACK TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool
async def query_slack_threads(
    channel_ids: List[str],
    keywords: List[str],
    integration_id: Optional[str] = None,
    days_back: int = 30,
    max_threads: int = 10,
    include_replies: bool = True,
    max_replies_per_thread: int = 20,
) -> SlackSearchResult:
    """
    Query Slack channel history for relevant discussions.
    
    Args:
        channel_ids: List of channel IDs to search
        keywords: Keywords to look for
        integration_id: Slack integration ID
        days_back: How many days back to search
        max_threads: Maximum threads to return
        include_replies: Whether to fetch thread replies for matched messages
        max_replies_per_thread: Max replies to fetch per thread
        
    Returns:
        SlackSearchResult with relevant threads
    """
    try:
        from app.services.slack import SlackClient
        from app.core.dependencies import supabase
        from datetime import datetime, timedelta
        
        if not integration_id or not channel_ids:
            return SlackSearchResult(keywords=keywords, total_results=0)
        
        # Try slack_integrations table first (new), then integrations (legacy)
        integration = None
        for table in ("slack_integrations", "integrations"):
            try:
                res = supabase.table(table).select("*").eq("id", integration_id).single().execute()
                if getattr(res, "data", None):
                    integration = res.data
                    break
            except Exception:
                continue
        
        if not integration:
            return SlackSearchResult(keywords=keywords, total_results=0)
        
        access_token = integration.get("bot_access_token") or integration.get("bot_token") or integration.get("access_token")
        if not access_token:
            return SlackSearchResult(keywords=keywords, total_results=0)
        
        # Detect if token is stored encrypted
        is_encrypted = bool(integration.get("bot_access_token") or integration.get("bot_token"))
        client = SlackClient(access_token, is_encrypted=is_encrypted)
        oldest = (datetime.now() - timedelta(days=days_back)).timestamp()
        
        threads = []
        
        for channel_id in channel_ids[:5]:  # Up to 5 channels
            try:
                history = client.client.conversations_history(
                    channel=channel_id,
                    oldest=str(oldest),
                    limit=200,
                )
                
                for msg in history.get("messages", []):
                    text = msg.get("text", "").lower()
                    if not any(kw.lower() in text for kw in keywords):
                        continue
                    
                    thread_ts = msg.get("thread_ts") or msg.get("ts")
                    messages = [{
                        "text": msg.get("text", ""),
                        "user": msg.get("user", ""),
                        "ts": msg.get("ts", ""),
                    }]
                    participants = {msg.get("user", "")}
                    
                    # Fetch thread replies
                    if include_replies and msg.get("reply_count", 0) > 0:
                        try:
                            replies_res = client.client.conversations_replies(
                                channel=channel_id,
                                ts=thread_ts,
                                limit=max_replies_per_thread,
                            )
                            for reply in replies_res.get("messages", [])[1:]:  # Skip parent
                                messages.append({
                                    "text": reply.get("text", ""),
                                    "user": reply.get("user", ""),
                                    "ts": reply.get("ts", ""),
                                })
                                participants.add(reply.get("user", ""))
                        except Exception as re:
                            logger.debug(f"Failed to fetch replies: {re}")
                    
                    threads.append(SlackThread(
                        channel_id=channel_id,
                        thread_ts=thread_ts,
                        messages=messages,
                        participants=list(participants - {""}),
                    ))
                    
                    if len(threads) >= max_threads:
                        break
                        
            except Exception as e:
                logger.warning(f"Failed to fetch channel {channel_id}: {e}")
                continue
        
        return SlackSearchResult(
            threads=threads[:max_threads],
            total_results=len(threads),
            keywords=keywords,
        )
        
    except Exception as e:
        logger.error(f"Slack search failed: {e}")
        return SlackSearchResult(keywords=keywords, total_results=0)


# ═══════════════════════════════════════════════════════════════════════════════
# WEB SEARCH TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool
async def web_search(
    query: str,
    num_results: int = 5,
    search_type: str = "general",
) -> WebSearchOutput:
    """
    Search the web for market research, competitor analysis, and industry trends.
    
    Args:
        query: Search query
        num_results: Number of results to return
        search_type: Type of search (general, market, competitor, technical)
        
    Returns:
        WebSearchOutput with search results
    """
    try:
        import httpx
        
        # Try Brave Search API first
        brave_api_key = os.getenv("BRAVE_API_KEY")
        if brave_api_key:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={"q": query, "count": num_results},
                    headers={"X-Subscription-Token": brave_api_key},
                    timeout=10.0,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    for item in data.get("web", {}).get("results", []):
                        results.append(WebSearchResult(
                            title=item.get("title", ""),
                            url=item.get("url", ""),
                            snippet=item.get("description", "")[:300],
                            source=item.get("site_name"),
                        ))
                    return WebSearchOutput(results=results, query=query)
        
        # Fallback: Try SerpAPI
        serp_api_key = os.getenv("SERP_API_KEY")
        if serp_api_key:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://serpapi.com/search",
                    params={
                        "q": query,
                        "api_key": serp_api_key,
                        "num": num_results,
                    },
                    timeout=10.0,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    for item in data.get("organic_results", []):
                        results.append(WebSearchResult(
                            title=item.get("title", ""),
                            url=item.get("link", ""),
                            snippet=item.get("snippet", "")[:300],
                        ))
                    return WebSearchOutput(results=results, query=query)
        
        # No API keys configured
        logger.warning("No web search API configured (BRAVE_API_KEY or SERP_API_KEY)")
        return WebSearchOutput(query=query, results=[])
        
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return WebSearchOutput(query=query, results=[])


# ═══════════════════════════════════════════════════════════════════════════════
# DUPLICATE DETECTION TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool
async def check_requirement_duplicates(
    requirements: List[str],
    threshold: float = 0.85,
) -> DuplicateCheckResult:
    """
    Check for duplicate or similar requirements using embeddings.
    
    Args:
        requirements: List of requirement strings to check
        threshold: Similarity threshold (0-1) for considering duplicates
        
    Returns:
        DuplicateCheckResult with duplicate groups and unique requirements
    """
    if len(requirements) < 2:
        return DuplicateCheckResult(
            unique_requirements=requirements,
            total_checked=len(requirements),
        )
    
    try:
        from app.services.embeddings import embed_texts, cosine_sim
        
        # Get embeddings for all requirements
        embeddings = embed_texts(requirements)
        
        if not embeddings or len(embeddings) != len(requirements):
            return DuplicateCheckResult(
                unique_requirements=requirements,
                total_checked=len(requirements),
            )
        
        # Find duplicates
        duplicate_groups: List[DuplicateGroup] = []
        used_indices = set()
        
        for i in range(len(requirements)):
            if i in used_indices:
                continue
            
            group = [requirements[i]]
            group_indices = {i}
            
            for j in range(i + 1, len(requirements)):
                if j in used_indices:
                    continue
                
                similarity = cosine_sim(embeddings[i].vector, embeddings[j].vector)
                if similarity >= threshold:
                    group.append(requirements[j])
                    group_indices.add(j)
            
            if len(group) > 1:
                duplicate_groups.append(DuplicateGroup(
                    requirements=group,
                    similarity_score=threshold,
                    suggested_merge=group[0],  # Use first as suggestion
                ))
                used_indices.update(group_indices)
        
        # Identify unique requirements
        unique = [
            req for i, req in enumerate(requirements)
            if i not in used_indices
        ]
        
        return DuplicateCheckResult(
            duplicate_groups=duplicate_groups,
            unique_requirements=unique,
            total_checked=len(requirements),
        )
        
    except Exception as e:
        logger.error(f"Duplicate check failed: {e}")
        return DuplicateCheckResult(
            unique_requirements=requirements,
            total_checked=len(requirements),
        )


# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool
async def validate_prd_section(
    section_name: str,
    content_json: str,
) -> ValidationResult:
    """
    Validate a PRD section against schema requirements.
    
    Args:
        section_name: Name of the section (executive_summary, personas, etc.)
        content_json: Section content as JSON string to validate
        
    Returns:
        ValidationResult with validation status and issues
    """
    import json
    try:
        content = json.loads(content_json)
    except json.JSONDecodeError:
        return ValidationResult(
            valid=False,
            issues=[ValidationIssue(
                field="*",
                issue="Invalid JSON content",
                severity="error",
            )],
            section=section_name,
        )
    
    issues: List[ValidationIssue] = []
    
    try:
        if section_name == "executive_summary":
            if not content.get("vision") or len(content.get("vision", "")) < 50:
                issues.append(ValidationIssue(
                    field="vision",
                    issue="Vision statement too short (minimum 50 characters)",
                    severity="error",
                    suggestion="Add more detail about the product's future state",
                ))
            
            if not content.get("key_objectives") or len(content.get("key_objectives", [])) < 3:
                issues.append(ValidationIssue(
                    field="key_objectives",
                    issue="Need at least 3 key objectives",
                    severity="error",
                    suggestion="Add more specific, measurable objectives",
                ))
            
            if not content.get("success_metrics") or len(content.get("success_metrics", [])) < 2:
                issues.append(ValidationIssue(
                    field="success_metrics",
                    issue="Need at least 2 success metrics",
                    severity="warning",
                    suggestion="Add quantifiable metrics with targets",
                ))
        
        elif section_name == "personas":
            personas = content.get("personas", [])
            if len(personas) < 2:
                issues.append(ValidationIssue(
                    field="personas",
                    issue="Need at least 2 user personas",
                    severity="error",
                ))
            
            for i, persona in enumerate(personas):
                if len(persona.get("pain_points", [])) < 2:
                    issues.append(ValidationIssue(
                        field=f"personas[{i}].pain_points",
                        issue=f"Persona '{persona.get('name', i)}' needs at least 2 pain points",
                        severity="warning",
                    ))
        
        elif section_name == "features":
            features = content.get("features", [])
            if len(features) < 3:
                issues.append(ValidationIssue(
                    field="features",
                    issue="Need at least 3 features",
                    severity="error",
                ))
            
            p0_count = sum(1 for f in features if f.get("priority") == "P0")
            if p0_count == 0:
                issues.append(ValidationIssue(
                    field="features",
                    issue="No P0 (must-have) features defined",
                    severity="warning",
                    suggestion="Mark core features as P0",
                ))
            
            for i, feature in enumerate(features):
                ac = feature.get("acceptance_criteria", [])
                if len(ac) < 3:
                    issues.append(ValidationIssue(
                        field=f"features[{i}].acceptance_criteria",
                        issue=f"Feature '{feature.get('title', i)}' needs at least 3 acceptance criteria",
                        severity="warning",
                    ))
        
        elif section_name == "technical":
            if not content.get("architecture_overview") or len(content.get("architecture_overview", "")) < 100:
                issues.append(ValidationIssue(
                    field="architecture_overview",
                    issue="Architecture overview too brief",
                    severity="warning",
                    suggestion="Add more detail about system components and their interactions",
                ))
            
            if len(content.get("security_requirements", [])) < 2:
                issues.append(ValidationIssue(
                    field="security_requirements",
                    issue="Need at least 2 security requirements",
                    severity="error",
                ))
        
        elif section_name == "risks":
            risks = content.get("risks", [])
            if len(risks) < 3:
                issues.append(ValidationIssue(
                    field="risks",
                    issue="Need at least 3 identified risks",
                    severity="warning",
                ))
            
            # Check category coverage
            categories = set(r.get("category") for r in risks)
            required_categories = {"Technical", "Business"}
            missing = required_categories - categories
            if missing:
                issues.append(ValidationIssue(
                    field="risks",
                    issue=f"Missing risk categories: {', '.join(missing)}",
                    severity="info",
                ))
        
        return ValidationResult(
            valid=not any(i.severity == "error" for i in issues),
            issues=issues,
            section=section_name,
        )
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        return ValidationResult(
            valid=False,
            issues=[ValidationIssue(
                field="*",
                issue=f"Validation error: {str(e)}",
                severity="error",
            )],
            section=section_name,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CODEBASE ANALYSIS TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool
async def analyze_codebase(
    repo_url: str,
    focus_areas: Optional[List[str]] = None,
) -> CodebaseAnalysis:
    """
    Analyze a repository for technical constraints and patterns.
    
    Args:
        repo_url: GitHub repository URL
        focus_areas: Specific areas to focus analysis on
        
    Returns:
        CodebaseAnalysis with technical insights
    """
    try:
        import httpx
        
        # Parse repo URL
        # Expected format: https://github.com/owner/repo
        parts = repo_url.rstrip("/").split("/")
        if len(parts) < 2:
            return CodebaseAnalysis(repo_url=repo_url, summary="Invalid repository URL")
        
        owner = parts[-2]
        repo = parts[-1]
        
        github_token = os.getenv("GITHUB_TOKEN")
        headers = {}
        if github_token:
            headers["Authorization"] = f"token {github_token}"
        
        async with httpx.AsyncClient() as client:
            # Get repo info
            repo_response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}",
                headers=headers,
                timeout=10.0,
            )
            
            if repo_response.status_code != 200:
                return CodebaseAnalysis(
                    repo_url=repo_url,
                    summary=f"Failed to access repository: {repo_response.status_code}",
                )
            
            repo_data = repo_response.json()
            
            # Get languages
            languages_response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/languages",
                headers=headers,
                timeout=10.0,
            )
            languages = list(languages_response.json().keys()) if languages_response.status_code == 200 else []
            
            # Detect frameworks from package files
            frameworks = []
            patterns = []
            
            # Try to get package.json
            try:
                pkg_response = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/contents/package.json",
                    headers=headers,
                    timeout=10.0,
                )
                if pkg_response.status_code == 200:
                    import base64
                    content = base64.b64decode(pkg_response.json().get("content", "")).decode()
                    pkg_data = __import__("json").loads(content)
                    deps = {**pkg_data.get("dependencies", {}), **pkg_data.get("devDependencies", {})}
                    
                    if "react" in deps:
                        frameworks.append("React")
                    if "vue" in deps:
                        frameworks.append("Vue")
                    if "next" in deps:
                        frameworks.append("Next.js")
                    if "express" in deps:
                        frameworks.append("Express")
                    if "fastify" in deps:
                        frameworks.append("Fastify")
            except:
                pass
            
            # Try to detect Python frameworks from requirements.txt
            try:
                req_response = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/contents/requirements.txt",
                    headers=headers,
                    timeout=10.0,
                )
                if req_response.status_code == 200:
                    import base64
                    content = base64.b64decode(req_response.json().get("content", "")).decode()
                    if "fastapi" in content.lower():
                        frameworks.append("FastAPI")
                    if "django" in content.lower():
                        frameworks.append("Django")
                    if "flask" in content.lower():
                        frameworks.append("Flask")
            except:
                pass
            
            return CodebaseAnalysis(
                repo_url=repo_url,
                languages=languages[:5],
                frameworks=frameworks,
                architecture_patterns=patterns,
                summary=f"{repo_data.get('description', 'No description')}. "
                        f"Primary language: {repo_data.get('language', 'Unknown')}. "
                        f"Stars: {repo_data.get('stargazers_count', 0)}",
            )
            
    except Exception as e:
        logger.error(f"Codebase analysis failed: {e}")
        return CodebaseAnalysis(
            repo_url=repo_url,
            summary=f"Analysis failed: {str(e)[:100]}",
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXT ENRICHMENT
# ═══════════════════════════════════════════════════════════════════════════════

async def enrich_prd_context(
    prd_input: "PRDInput",
    jira_integration_id: Optional[str] = None,
    atlassian_integration_id: Optional[str] = None,
    slack_integration_id: Optional[str] = None,
) -> "EnrichedContext":
    """
    Gather context from all available sources in parallel.
    
    Args:
        prd_input: The PRD input with optional source references
        jira_integration_id: Jira OAuth integration ID
        atlassian_integration_id: Atlassian (Confluence) integration ID
        slack_integration_id: Slack integration ID
        
    Returns:
        EnrichedContext with data from all sources
    """
    # NOTE: Confluence is currently not supported for PRD enrichment in this project.
    # We keep the parameter for backward-compatibility, but we do not call any
    # Confluence tools here.
    from app.models.prd_models import EnrichedContext, JiraContext, SlackContext, WebSearchResult as WebSearchResultModel

    # Pydantic validators typically normalize this to a list, but the static type is
    # `Union[str, List[str]]`. Normalize here to keep both runtime and type-checkers happy.
    target_users: List[str]
    if isinstance(prd_input.target_users, list):
        target_users = prd_input.target_users
    elif prd_input.target_users:
        target_users = [str(prd_input.target_users)]
    else:
        target_users = []
    
    tasks = []
    task_names = []
    
    # Jira context
    if prd_input.jira_epic_key:
        tasks.append(fetch_jira_context(
            epic_key=prd_input.jira_epic_key,
            integration_id=jira_integration_id,
        ))
        task_names.append("jira")
    
    # Slack context
    if prd_input.slack_channel_ids:
        keywords = target_users + [prd_input.product_name or ""]
        keywords = [k for k in keywords if k]
        tasks.append(query_slack_threads(
            channel_ids=prd_input.slack_channel_ids,
            keywords=keywords[:5],
            integration_id=slack_integration_id,
        ))
        task_names.append("slack")
    
    # Web search for market context
    if prd_input.problem_statement:
        search_query = f"{prd_input.product_name or ''} {' '.join(target_users[:2])} market"
        tasks.append(web_search(query=search_query.strip(), num_results=3))
        task_names.append("web")
    
    # Codebase analysis
    if prd_input.github_repo:
        tasks.append(analyze_codebase(repo_url=prd_input.github_repo))
        task_names.append("codebase")
    
    # Run all tasks in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Build enriched context
    context = EnrichedContext()
    
    for name, result in zip(task_names, results):
        if isinstance(result, Exception):
            logger.warning(f"Context enrichment for {name} failed: {result}")
            continue
        
        if name == "jira" and isinstance(result, JiraEpicContext):
            context.jira = JiraContext(
                epic_key=result.epic_key,
                epic_summary=result.summary,
                epic_description=result.description,
                child_issues=result.child_issues,
                comments=result.comments,
                labels=result.labels,
            )
        elif name == "slack" and isinstance(result, SlackSearchResult):
            context.slack = SlackContext(
                threads=[{"channel": t.channel_id, "messages": t.messages} for t in result.threads],
                participants=list(set(p for t in result.threads for p in t.participants)),
            )
        elif name == "web" and isinstance(result, WebSearchOutput):
            context.web_search = [
                WebSearchResultModel(title=r.title, url=r.url, snippet=r.snippet)
                for r in result.results
            ]
        elif name == "codebase" and isinstance(result, CodebaseAnalysis):
            context.codebase_analysis = {
                "languages": result.languages,
                "frameworks": result.frameworks,
                "summary": result.summary,
            }
    
    return context
