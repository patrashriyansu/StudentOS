"""
Gemini AI service — abstraction layer.
Falls back to intelligent, topic-aware stub responses if GEMINI_API_KEY is not configured.
"""
from backend.core.config import settings
import json
import re
import random

_gemini_available = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-key")

if _gemini_available:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _model = genai.GenerativeModel("gemini-1.5-flash")
    except Exception:
        _gemini_available = False
        _model = None
else:
    _model = None


async def ask_gemini(prompt: str, system_hint: str = "") -> str:
    """Send a prompt to Gemini and return the text response."""
    if not _gemini_available or _model is None:
        return _fallback_response(prompt)
    try:
        full_prompt = f"{system_hint}\n\n{prompt}" if system_hint else prompt
        response = _model.generate_content(full_prompt)
        return response.text
    except Exception:
        return _fallback_response(prompt)


async def ask_gemini_json(prompt: str, system_hint: str = "") -> dict | list:
    """Ask Gemini and parse JSON from the response."""
    text = await ask_gemini(prompt, system_hint)
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()
    try:
        return json.loads(text)
    except Exception:
        return {"raw": text}


# ── Topic question banks ─────────────────────────────────────────────────────────

_TOPIC_QUESTIONS = {
    "array": [
        {
            "q": "Given an array of integers, find the maximum subarray sum (Kadane's Algorithm). What is its time complexity?",
            "a": "**Kadane's Algorithm** — O(n) time, O(1) space.\n\nApproach:\n```python\nmax_sum = curr_sum = arr[0]\nfor x in arr[1:]:\n    curr_sum = max(x, curr_sum + x)\n    max_sum = max(max_sum, curr_sum)\n```\nKey insight: At each index, decide whether to extend the current subarray or start a new one from `x`."
        },
        {
            "q": "Find the duplicate number in an array of n+1 integers where all values are in range [1, n] — without extra space.",
            "a": "**Floyd's Cycle Detection** — treat the array like a linked list where `arr[i]` is the next pointer.\n- Phase 1: Find the cycle intersection using slow/fast pointers.\n- Phase 2: Find the cycle entrance (= duplicate).\n- Time: O(n), Space: O(1)."
        },
        {
            "q": "Given a sorted rotated array, find a target element in O(log n) time.",
            "a": "**Modified Binary Search:**\n```python\nlo, hi = 0, len(arr)-1\nwhile lo <= hi:\n    mid = (lo+hi)//2\n    if arr[mid] == target: return mid\n    if arr[lo] <= arr[mid]:  # left half sorted\n        if arr[lo] <= target < arr[mid]: hi = mid-1\n        else: lo = mid+1\n    else:  # right half sorted\n        if arr[mid] < target <= arr[hi]: lo = mid+1\n        else: hi = mid-1\nreturn -1\n```"
        },
        {
            "q": "Merge two sorted arrays in O(1) extra space. What is the time complexity?",
            "a": "**Gap Method (Shell Sort variant)** — O(n log n) time, O(1) space.\n\n- Start with gap = ceil((n+m)/2), compare elements gap apart across both arrays and swap if out of order.\n- Halve the gap each pass until gap = 1.\n\nAlternative (O(n+m) time, O(n+m) space): standard merge with extra array."
        },
        {
            "q": "Find all triplets in an array that sum to zero. Optimize beyond O(n³).",
            "a": "**Two-pointer after sorting** — O(n²) time, O(1) space:\n```python\narr.sort()\nresult = []\nfor i in range(len(arr)-2):\n    if i > 0 and arr[i] == arr[i-1]: continue  # skip duplicates\n    l, r = i+1, len(arr)-1\n    while l < r:\n        s = arr[i]+arr[l]+arr[r]\n        if s == 0: result.append([arr[i],arr[l],arr[r]]); l+=1; r-=1\n        elif s < 0: l+=1\n        else: r-=1\n```"
        },
    ],
    "linked list": [
        {
            "q": "Detect if a linked list has a cycle. What are two approaches and their complexities?",
            "a": "**1. Floyd's Cycle Detection (Tortoise & Hare):** O(n) time, O(1) space.\n- slow moves 1 step, fast moves 2 steps. If they meet → cycle exists.\n\n**2. HashSet approach:** O(n) time, O(n) space.\n- Store visited node addresses; if seen again → cycle."
        },
        {
            "q": "Reverse a linked list — iteratively and recursively.",
            "a": "**Iterative:** O(n) time, O(1) space:\n```python\nprev, curr = None, head\nwhile curr:\n    nxt = curr.next\n    curr.next = prev\n    prev = curr\n    curr = nxt\nreturn prev\n```\n\n**Recursive:** O(n) time, O(n) stack space:\n```python\ndef reverse(node):\n    if not node or not node.next: return node\n    new_head = reverse(node.next)\n    node.next.next = node\n    node.next = None\n    return new_head\n```"
        },
        {
            "q": "Find the middle node of a linked list in one pass.",
            "a": "**Slow/Fast pointer technique:**\n```python\nslow = fast = head\nwhile fast and fast.next:\n    slow = slow.next\n    fast = fast.next.next\nreturn slow  # slow is now at the middle\n```\nFor even-length lists this returns the second middle node."
        },
    ],
    "tree": [
        {
            "q": "What are the three DFS traversal orders for a binary tree? Write their recursive implementations.",
            "a": "```python\n# Inorder (Left → Root → Right)\ndef inorder(node):\n    if node: inorder(node.left); visit(node); inorder(node.right)\n\n# Preorder (Root → Left → Right)\ndef preorder(node):\n    if node: visit(node); preorder(node.left); preorder(node.right)\n\n# Postorder (Left → Right → Root)\ndef postorder(node):\n    if node: postorder(node.left); postorder(node.right); visit(node)\n```\nInorder of a BST gives a **sorted sequence** — a key property."
        },
        {
            "q": "Check if a binary tree is a valid BST.",
            "a": "**Track valid range at each node:**\n```python\ndef isValidBST(node, lo=float('-inf'), hi=float('inf')):\n    if not node: return True\n    if not (lo < node.val < hi): return False\n    return (isValidBST(node.left, lo, node.val) and\n            isValidBST(node.right, node.val, hi))\n```\nO(n) time, O(h) space where h = height."
        },
        {
            "q": "Find the Lowest Common Ancestor (LCA) of two nodes in a binary tree.",
            "a": "```python\ndef lca(root, p, q):\n    if not root or root == p or root == q: return root\n    left = lca(root.left, p, q)\n    right = lca(root.right, p, q)\n    if left and right: return root  # p and q in different subtrees\n    return left or right  # both in same subtree\n```\nO(n) time, O(h) space."
        },
    ],
    "graph": [
        {
            "q": "Explain BFS and DFS on a graph. What data structures do they use?",
            "a": "**BFS** (Breadth-First Search):\n- Uses a **Queue** (FIFO)\n- Explores level by level — optimal for **shortest path in unweighted graphs**\n- Time: O(V + E), Space: O(V)\n\n**DFS** (Depth-First Search):\n- Uses a **Stack** (or recursion)\n- Explores as deep as possible before backtracking — good for **cycle detection, topological sort**\n- Time: O(V + E), Space: O(V)"
        },
        {
            "q": "Detect a cycle in a directed graph using DFS.",
            "a": "**Track 3 states per node:** unvisited (0), in-stack (1), done (2).\n```python\ndef has_cycle(graph, n):\n    state = [0]*n\n    def dfs(u):\n        state[u] = 1  # in stack\n        for v in graph[u]:\n            if state[v] == 1: return True  # back edge\n            if state[v] == 0 and dfs(v): return True\n        state[u] = 2\n        return False\n    return any(dfs(i) for i in range(n) if state[i]==0)\n```"
        },
        {
            "q": "Explain Topological Sort and when it applies.",
            "a": "**Topological Sort** orders nodes of a DAG (Directed Acyclic Graph) such that for every edge u→v, u appears before v.\n\n**Kahn's Algorithm (BFS):**\n1. Compute in-degree of all nodes\n2. Enqueue all nodes with in-degree 0\n3. Process queue: for each node, reduce neighbors' in-degree; enqueue if it hits 0\n\n**Applications:** Course scheduling, build system dependencies, task ordering."
        },
    ],
    "dp": [
        {
            "q": "Solve the 0/1 Knapsack problem using Dynamic Programming. State the recurrence.",
            "a": "**Recurrence:**\n`dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w-wt[i]])` if `wt[i] <= w`\n\nElse `dp[i][w] = dp[i-1][w]`\n\n```python\ndp = [[0]*(W+1) for _ in range(n+1)]\nfor i in range(1, n+1):\n    for w in range(W+1):\n        dp[i][w] = dp[i-1][w]\n        if wt[i-1] <= w:\n            dp[i][w] = max(dp[i][w], val[i-1]+dp[i-1][w-wt[i-1]])\nreturn dp[n][W]\n```\nTime: O(nW), Space: O(nW) reducible to O(W) with 1D DP."
        },
        {
            "q": "Find the Longest Common Subsequence (LCS) of two strings.",
            "a": "**Recurrence:**\n- If `s1[i]==s2[j]`: `dp[i][j] = 1 + dp[i-1][j-1]`\n- Else: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`\n\n```python\nm, n = len(s1), len(s2)\ndp = [[0]*(n+1) for _ in range(m+1)]\nfor i in range(1,m+1):\n    for j in range(1,n+1):\n        dp[i][j] = 1+dp[i-1][j-1] if s1[i-1]==s2[j-1] else max(dp[i-1][j],dp[i][j-1])\nreturn dp[m][n]\n```\nTime: O(mn), Space: O(mn)."
        },
    ],
    "string": [
        {
            "q": "Check if two strings are anagrams of each other in O(n) time.",
            "a": "**Frequency count approach:**\n```python\nfrom collections import Counter\ndef is_anagram(s, t):\n    return len(s) == len(t) and Counter(s) == Counter(t)\n```\nOr using a single frequency array of size 26 for lowercase English letters — increment for s, decrement for t, check all zeros."
        },
        {
            "q": "Find all occurrences of a pattern in a text using KMP algorithm.",
            "a": "**KMP** preprocesses the pattern into an LPS (Longest Proper Prefix which is also Suffix) array in O(m) time, then matches in O(n) — total **O(n+m)** vs O(nm) for naive.\n\n- LPS[i] = length of longest proper prefix of `pattern[0..i]` which is also a suffix.\n- On mismatch, use LPS to skip comparisons instead of resetting to 0."
        },
    ],
    "os": [
        {
            "q": "What is a deadlock? State the four necessary Coffman conditions.",
            "a": "**Deadlock:** A state where a set of processes are blocked, each waiting for a resource held by another.\n\n**Four Coffman Conditions (ALL must hold simultaneously):**\n1. **Mutual Exclusion:** Resource held by only one process at a time.\n2. **Hold and Wait:** Process holds ≥1 resource and waits to acquire more.\n3. **No Preemption:** Resources can only be released voluntarily.\n4. **Circular Wait:** P1 waits for P2, P2 waits for P3, ... Pn waits for P1."
        },
        {
            "q": "Compare process vs thread. What is a race condition?",
            "a": "**Process:** Independent program in execution with its own memory space (PCB, heap, stack, code).\n**Thread:** Lightweight unit of execution within a process — **shares** heap and code, has its own stack and registers.\n\n**Race Condition:** When two or more threads access shared data concurrently and at least one modifies it — the result depends on the execution order (timing), producing non-deterministic bugs.\n\n**Fix:** Mutexes, semaphores, or atomic operations."
        },
    ],
    "dbms": [
        {
            "q": "What are ACID properties in a database? Explain each.",
            "a": "**A — Atomicity:** A transaction is all-or-nothing. If any step fails, the entire transaction is rolled back.\n\n**C — Consistency:** A transaction brings the database from one valid state to another — all integrity constraints remain satisfied.\n\n**I — Isolation:** Concurrent transactions execute as if they were serial — intermediate states are invisible to other transactions.\n\n**D — Durability:** Once committed, a transaction's changes survive system failures (persisted to disk via WAL/redo logs)."
        },
        {
            "q": "What is an index in a database? What types are common?",
            "a": "An **index** is a data structure (usually a B-Tree or Hash) that improves SELECT query speed at the cost of additional write overhead and storage.\n\n**Common Types:**\n- **B-Tree Index:** Supports range queries, ORDER BY, LIKE 'prefix%'. Default in most RDBMS.\n- **Hash Index:** O(1) exact-match lookups. Does not support range queries.\n- **Composite Index:** Index on multiple columns — follow left-prefix rule.\n- **Covering Index:** Index that contains all columns needed by a query — avoids table lookup entirely."
        },
    ],
    "sorting": [
        {
            "q": "Compare Merge Sort and Quick Sort in terms of time/space complexity and stability.",
            "a": "| Property | Merge Sort | Quick Sort |\n|---|---|---|\n| Best Case | O(n log n) | O(n log n) |\n| Average Case | O(n log n) | O(n log n) |\n| Worst Case | O(n log n) | O(n²) |\n| Space | O(n) | O(log n) |\n| Stable | ✅ Yes | ❌ No (typically) |\n| In-place | ❌ No | ✅ Yes |\n\n**Use Merge Sort:** When stability matters or for linked lists.\n**Use Quick Sort:** When average-case performance matters and memory is limited."
        },
    ],
    "binary search": [
        {
            "q": "Write the standard binary search template and explain the off-by-one conditions.",
            "a": "```python\ndef binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = lo + (hi - lo) // 2  # avoid overflow\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: lo = mid + 1\n        else: hi = mid - 1\n    return -1  # not found\n```\n**Key rules:**\n- Use `lo + (hi-lo)//2` not `(lo+hi)//2` to avoid integer overflow in other languages.\n- Loop condition `lo <= hi` (not `<`) ensures the single-element case is checked.\n- `lo = mid+1` and `hi = mid-1` (not `mid`) prevents infinite loops."
        },
    ],
    "recursion": [
        {
            "q": "What is the time complexity of computing Fibonacci recursively vs with memoization?",
            "a": "**Naive recursion:** `O(2ⁿ)` — exponential, because the same subproblems are recomputed repeatedly.\n\n**With memoization (Top-Down DP):** `O(n)` time, `O(n)` space.\n```python\nfrom functools import lru_cache\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n```\n\n**Bottom-Up DP:** `O(n)` time, `O(1)` space by only tracking previous two values."
        },
    ],
}

_TOPIC_ALIASES = {
    "arr": "array", "arrays": "array",
    "ll": "linked list", "linkedlist": "linked list", "linked lists": "linked list",
    "trees": "tree", "bst": "tree", "binary tree": "tree",
    "graphs": "graph", "bfs": "graph", "dfs": "graph",
    "dynamic programming": "dp", "memoization": "dp",
    "strings": "string", "str": "string",
    "operating system": "os", "process": "os", "thread": "os", "deadlock": "os",
    "database": "dbms", "sql": "dbms", "dbms": "dbms", "rdbms": "dbms",
    "sort": "sorting", "bubble sort": "sorting", "merge sort": "sorting", "quick sort": "sorting",
    "bs": "binary search", "bsearch": "binary search",
    "recur": "recursion", "recursive": "recursion",
}

_topic_question_counter: dict[str, int] = {}


def _detect_topic(text: str) -> str | None:
    """Extract topic from a message like 'array q' or 'linked list question'."""
    t = text.lower().strip()
    # Remove trailing "question" / "q" / "give" / "more" etc.
    t = re.sub(r"\b(question|questions|qs?|give\s+me|give|more|next|another|problem|problems)\b", "", t)
    t = t.strip(" ?.,!:")
    if t in _TOPIC_ALIASES:
        return _TOPIC_ALIASES[t]
    if t in _TOPIC_QUESTIONS:
        return t
    # Substring match
    for alias, canonical in _TOPIC_ALIASES.items():
        if alias in t:
            return canonical
    for canonical in _TOPIC_QUESTIONS:
        if canonical in t:
            return canonical
    return None


def _is_question_request(text: str) -> bool:
    """Detect if the user wants a practice question."""
    t = text.lower()
    triggers = [
        r"\bq\b", r"\bqs\b", r"\bquestion\b", r"\bproblem\b", r"\bgive\b",
        r"\bnext\b", r"\bmore\b", r"\banother\b", r"\bpractice\b", r"\bask me\b",
        r"\btest me\b", r"\bquiz\b",
    ]
    return any(re.search(p, t) for p in triggers)


def _get_topic_question(topic: str) -> str:
    """Round-robin through topic questions."""
    questions = _TOPIC_QUESTIONS.get(topic, [])
    if not questions:
        return f"I don't have a question bank for **{topic}** yet. Try: arrays, linked lists, trees, graphs, DP, strings, OS, DBMS, sorting, binary search, recursion."
    idx = _topic_question_counter.get(topic, 0) % len(questions)
    _topic_question_counter[topic] = idx + 1
    qa = questions[idx]
    return (
        f"**Practice Question #{idx + 1} — {topic.title()}:**\n\n"
        f"❓ {qa['q']}\n\n"
        f"---\n\n"
        f"💡 **Answer / Approach:**\n\n{qa['a']}"
    )


def _fallback_response(prompt: str) -> str:
    p = prompt.lower()

    # ── Quiz JSON generation ──────────────────────────────────────────────────
    if "generate quiz" in p or "generate-quiz" in p or "multiple-choice" in p:
        topic_match = re.search(r"topic[:=]?\s*([a-z ]+)", p)
        topic_label = topic_match.group(1).strip() if topic_match else "Data Structures"
        detected = _detect_topic(topic_label) or "array"
        qs = _TOPIC_QUESTIONS.get(detected, _TOPIC_QUESTIONS["array"])
        questions_out = []
        for qa in qs[:5]:
            q_text = qa["q"]
            # Build 4 plausible options (first is correct as a placeholder)
            questions_out.append({
                "question": q_text,
                "options": ["See explanation below", "O(n²) time", "O(n) space only", "Impossible without extra space"],
                "correct": 0,
                "explanation": qa["a"][:200] + "..."
            })
        return json.dumps({"questions": questions_out[:5]})

    # ── Flashcard JSON generation ─────────────────────────────────────────────
    if "flashcard" in p or "flash card" in p or "generate-flashcard" in p:
        detected = _detect_topic(p) or "array"
        qs = _TOPIC_QUESTIONS.get(detected, _TOPIC_QUESTIONS["array"])
        cards = [{"front": qa["q"], "back": qa["a"][:300]} for qa in qs[:6]]
        return json.dumps({"cards": cards})

    # ── Summarize ─────────────────────────────────────────────────────────────
    if "summarize" in p or "summary" in p:
        return (
            "**Structured Summary:**\n\n"
            "• **Core Definition:** The material introduces fundamental principles and their mathematical foundations.\n"
            "• **Key Algorithms / Techniques:** Systematic approaches with defined time and space complexities.\n"
            "• **Critical Patterns:** Recognize boundary conditions, invariant maintenance, and trade-off analysis.\n"
            "• **Exam Takeaways:** State assumptions explicitly. Write recurrences. Justify complexity. Draw diagrams.\n\n"
            "**Quick Revision Tip:** Test yourself by deriving the solution from scratch — don't just read it."
        )

    # ── Study plan ────────────────────────────────────────────────────────────
    if "study plan" in p or "schedule" in p:
        return json.dumps({"plan": [
            {"day": 1, "focus": "Arrays & Strings", "hours": 2, "topics": ["Two pointers", "Sliding window", "Kadane's"]},
            {"day": 2, "focus": "Linked Lists & Stacks", "hours": 2.5, "topics": ["Cycle detection", "Reversal", "Monotonic stack"]},
            {"day": 3, "focus": "Trees & Binary Search", "hours": 3, "topics": ["Traversals", "BST operations", "LCA"]},
            {"day": 4, "focus": "Graphs", "hours": 3, "topics": ["BFS/DFS", "Topological sort", "Dijkstra"]},
            {"day": 5, "focus": "Dynamic Programming", "hours": 3, "topics": ["Memoization", "Tabulation", "Classic problems"]},
            {"day": 6, "focus": "Mock Practice + Revision", "hours": 2, "topics": ["Timed problems", "Weak area drill", "Flashcard review"]},
        ]})

    # ── Specific topic questions ───────────────────────────────────────────────
    topic = _detect_topic(p)
    if topic and _is_question_request(p):
        return _get_topic_question(topic)

    # ── Topic explanation (no explicit question request) ───────────────────────
    if topic:
        qa = _TOPIC_QUESTIONS[topic][0]
        return (
            f"### {topic.title()} — Key Concept\n\n"
            f"**Common Interview Question:**\n{qa['q']}\n\n"
            f"**Approach & Answer:**\n\n{qa['a']}\n\n"
            f"---\n"
            f"💬 *Ask \"give me another {topic} question\" for more practice problems.*"
        )

    # ── Algorithm-specific explanations ──────────────────────────────────────
    if "dijkstra" in p:
        return (
            "### Dijkstra's Shortest Path Algorithm:\n\n"
            "• **Purpose:** Finds shortest paths from a single source in a weighted graph (non-negative weights).\n"
            "• **Data Structure:** Min-heap (priority queue).\n"
            "• **Time Complexity:** `O((V + E) log V)` with binary heap.\n"
            "• **Key Invariant:** Once a node is popped from the heap, its shortest distance is final.\n\n"
            "⚠️ Does NOT work with negative edge weights — use Bellman-Ford instead."
        )

    if "quicksort" in p or "quick sort" in p:
        return (
            "### Quicksort — Time Complexity:\n\n"
            "| Case | Complexity |\n|---|---|\n"
            "| Best | O(n log n) |\n"
            "| Average | O(n log n) |\n"
            "| Worst (sorted input) | O(n²) |\n"
            "| Space | O(log n) call stack |\n\n"
            "💡 Use **randomized pivot** or **median-of-three** to avoid O(n²) worst case."
        )

    if "normalization" in p or "bcnf" in p or "acid" in p:
        return _TOPIC_QUESTIONS["dbms"][0]["a"]

    if "react" in p or "virtual dom" in p:
        return (
            "### React Virtual DOM & Reconciliation:\n\n"
            "• An in-memory lightweight copy of the real browser DOM.\n"
            "• On state/prop change, React diffs new vDOM vs previous using O(n) heuristic algorithm.\n"
            "• Only changed nodes are patched to the real DOM — minimizing expensive reflows.\n"
            "• React 18 Fiber scheduler batches updates for concurrent rendering."
        )

    # ── Generic helpful response (no offline note) ────────────────────────────
    return (
        "### AI Academic Copilot — What can I help with?\n\n"
        "Try asking me:\n\n"
        "• **`array question`** — Practice DSA problems (arrays, trees, graphs, DP, strings, OS, DBMS...)\n"
        "• **`explain binary search`** — Concept explanations with code\n"
        "• **`what is deadlock`** — OS/DBMS theory\n"
        "• **`Dijkstra algorithm`** — Algorithm deep-dives\n"
        "• **`generate quiz on trees`** — Adaptive MCQs\n"
        "• **`create flashcards on DP`** — Spaced repetition cards\n\n"
        "Supported topics: **Arrays, Linked Lists, Trees, Graphs, DP, Strings, OS, DBMS, Sorting, Binary Search, Recursion**"
    )
