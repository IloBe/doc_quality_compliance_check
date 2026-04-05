"""Route-to-test drift audit tool.

Builds an inventory of all FastAPI routes in src/doc_quality/api/routes/ and
checks for test coverage. Reports unmapped routes and provides both programmatic
and CLI interfaces for CI integration.

Usage:
    from route_coverage_audit import RouteAudit
    audit = RouteAudit()
    audit.run()
    if not audit.all_routes_mapped:
        exit(1)  # CI failure
    
    or:
    
    python route_coverage_audit.py  # Exit 0 if all mapped, 1 if drift detected
"""
from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Route:
    """Single endpoint route metadata."""

    file: str
    prefix: str
    method: str
    path: str
    handler_name: str
    line_number: int = 0

    @property
    def full_path(self) -> str:
        """Fully qualified route path."""
        return f"{self.prefix}{self.path}"

    @property
    def route_id(self) -> str:
        """Unique identifier: METHOD /prefix/path."""
        return f"{self.method.upper()} {self.full_path}"

    def __repr__(self) -> str:
        return f"{self.route_id} ({self.file}:{self.line_number})"


@dataclass
class TestCoverage:
    """Test file coverage report."""

    test_file: str
    routes_found: list[str] = field(default_factory=list)
    """List of route_id strings found in test file."""

    def covers_route(self, route_id: str) -> bool:
        """Check if this test file references a route."""
        return any(rid in route_id or route_id in rid for rid in self.routes_found)


class RouteInventoryBuilder(ast.NodeVisitor):
    """AST visitor to extract FastAPI route definitions from Python files."""

    def __init__(self, file_path: str, prefix: str = ""):
        self.file_path = file_path
        self.prefix = prefix
        self.routes: list[Route] = []
        self.current_router_prefix = prefix

    def visit_Assign(self, node: ast.Assign) -> None:
        """Capture 'router = APIRouter(prefix=...)' to extract base prefix."""
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == "router":
                if isinstance(node.value, ast.Call):
                    for keyword in node.value.keywords:
                        if keyword.arg == "prefix":
                            if isinstance(keyword.value, ast.Constant):
                                self.current_router_prefix = keyword.value.value
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """Capture @router.get/post/put/delete decorated functions."""
        self._process_function_decorators(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        """Capture @router.get/post/put/delete decorated async functions."""
        self._process_function_decorators(node)
        self.generic_visit(node)

    def _process_function_decorators(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        """Extract route decorators from a function node."""
        if not node.decorator_list:
            return

        for decorator in node.decorator_list:
            if self._is_router_decorator(decorator):
                method, path = self._extract_router_call(decorator)
                if method and path is not None:
                    route = Route(
                        file=self.file_path,
                        prefix=self.current_router_prefix,
                        method=method,
                        path=path,
                        handler_name=node.name,
                        line_number=node.lineno,
                    )
                    self.routes.append(route)

    def _is_router_decorator(self, decorator: ast.expr) -> bool:
        """Check if decorator is @router.get/@router.post etc."""
        func = None
        
        # Handle @router.get(...) - Call node with Attribute func
        if isinstance(decorator, ast.Call):
            func = decorator.func
        # Handle bare @router.get - just Attribute node
        elif isinstance(decorator, ast.Attribute):
            func = decorator

        if isinstance(func, ast.Attribute):
            if isinstance(func.value, ast.Name) and func.value.id == "router":
                return func.attr in ("get", "post", "put", "delete", "patch", "head", "options")
        return False

    def _extract_router_call(self, decorator: ast.expr) -> tuple[str | None, str | None]:
        """Extract HTTP method and path from @router.METHOD(...) decorator."""
        method = None
        path = None

        if isinstance(decorator, ast.Call):
            func = decorator.func
            # Extract method
            if isinstance(func, ast.Attribute):
                method = func.attr.lower()
            # Extract path (first positional arg)
            if decorator.args and isinstance(decorator.args[0], ast.Constant):
                path = decorator.args[0].value
        return method, path


class RouteAudit:
    """Main audit runner: builds route inventory and checks test coverage."""

    def __init__(
        self,
        routes_dir: str | None = None,
        tests_dir: str | None = None,
    ):
        """
        Args:
            routes_dir: Path to src/doc_quality/api/routes directory.
            tests_dir: Path to tests directory.
        """
        self.routes_dir = Path(routes_dir or "src/doc_quality/api/routes")
        self.tests_dir = Path(tests_dir or "tests")
        self.routes: list[Route] = []
        self.test_coverage: dict[str, TestCoverage] = {}
        self.unmapped_routes: list[Route] = []

    def run(self) -> bool:
        """Run full audit: discover routes, check coverage, report drift.
        
        Returns:
            True if all routes are mapped, False if drift detected.
        """
        self._discover_routes()
        self._check_test_coverage()
        self._identify_unmapped_routes()
        return len(self.unmapped_routes) == 0

    def _discover_routes(self) -> None:
        """Scan all route files and extract route definitions."""
        if not self.routes_dir.exists():
            raise FileNotFoundError(f"Routes directory not found: {self.routes_dir}")

        for route_file in sorted(self.routes_dir.glob("*.py")):
            if route_file.name.startswith("__"):
                continue

            with open(route_file, "r", encoding="utf-8") as f:
                try:
                    tree = ast.parse(f.read(), filename=str(route_file))
                except SyntaxError as e:
                    print(f"Syntax error in {route_file}: {e}")
                    continue

            builder = RouteInventoryBuilder(route_file.name)
            builder.visit(tree)
            self.routes.extend(builder.routes)

    def _check_test_coverage(self) -> None:
        """Scan test files for references to routes."""
        if not self.tests_dir.exists():
            raise FileNotFoundError(f"Tests directory not found: {self.tests_dir}")

        for test_file in sorted(self.tests_dir.glob("test_*.py")):
            with open(test_file, "r", encoding="utf-8") as f:
                content = f.read()

            coverage = TestCoverage(test_file=test_file.name)

            # Look for route references in test file:
            # - Direct path strings like "/documents/analyze"
            # - client.get/post/put/delete calls with URLs
            for route in self.routes:
                # Check for exact path match in string literals
                if f'"{route.path}"' in content or f"'{route.path}'" in content:
                    coverage.routes_found.append(route.route_id)
                    continue

                # Check for full path including prefix
                if f'"{route.full_path}"' in content or f"'{route.full_path}'" in content:
                    coverage.routes_found.append(route.route_id)
                    continue

                # Check for prefix/method pattern like /admin/stakeholder-profiles
                # This handles cases where the path is in a variable or formatted string
                if route.prefix and route.prefix in content:
                    # Make sure we also see the method being called
                    pattern = rf"\.{route.method.lower()}.*{route.prefix}"
                    if re.search(pattern, content, re.DOTALL | re.IGNORECASE):
                        coverage.routes_found.append(route.route_id)
                        continue

                # Check for path parameter patterns - match /something/{param}
                # by looking for the base path and a path() or Path() with that base
                path_without_params = re.sub(r'\{[^}]+\}', '[^"\']+', route.path)
                if re.search(f'["\']({re.escape(path_without_params)}|{re.escape(route.path)})["\']', content):
                    coverage.routes_found.append(route.route_id)

            self.test_coverage[test_file.name] = coverage

    def _identify_unmapped_routes(self) -> None:
        """Build list of routes with no test coverage."""
        all_covered_routes = set()
        for coverage in self.test_coverage.values():
            all_covered_routes.update(coverage.routes_found)

        self.unmapped_routes = [
            route for route in self.routes if route.route_id not in all_covered_routes
        ]

    @property
    def all_routes_mapped(self) -> bool:
        """True if every route has at least one test reference."""
        return len(self.unmapped_routes) == 0

    def report(self, verbose: bool = False) -> str:
        """Generate a human-readable report of the audit.
        
        Args:
            verbose: Include full route listings.
            
        Returns:
            Report as a multi-line string.
        """
        lines = []

        lines.append("=" * 70)
        lines.append("ROUTE-TO-TEST COVERAGE AUDIT")
        lines.append("=" * 70)
        lines.append("")

        lines.append(f"Total routes discovered: {len(self.routes)}")
        lines.append(f"Test files scanned: {len(self.test_coverage)}")
        lines.append("")

        if self.all_routes_mapped:
            lines.append("[OK] STATUS: All routes are mapped to tests")
            lines.append("")
        else:
            lines.append(f"[FAIL] STATUS: {len(self.unmapped_routes)} route(s) lack test coverage")
            lines.append("")

            lines.append("UNMAPPED ROUTES:")
            lines.append("-" * 70)
            for route in sorted(self.unmapped_routes, key=lambda r: r.route_id):
                lines.append(f"  {route}")
            lines.append("")

        if verbose:
            lines.append("MAPPED ROUTES:")
            lines.append("-" * 70)
            for route in sorted(self.routes, key=lambda r: r.route_id):
                status = "[OK]" if route.route_id not in {r.route_id for r in self.unmapped_routes} else "[X]"
                lines.append(f"  {status} {route}")
            lines.append("")

            lines.append("COVERAGE BY TEST FILE:")
            lines.append("-" * 70)
            for test_file in sorted(self.test_coverage.keys()):
                coverage = self.test_coverage[test_file]
                lines.append(f"  {test_file}: {len(coverage.routes_found)} routes")
                if coverage.routes_found:
                    for route_id in sorted(coverage.routes_found):
                        lines.append(f"    - {route_id}")
            lines.append("")

        lines.append("=" * 70)

        return "\n".join(lines)


def main() -> int:
    """CLI entry point."""
    audit = RouteAudit()
    try:
        audit.run()
    except Exception as e:
        print(f"Error running audit: {e}", flush=True)
        return 1

    print(audit.report(verbose=True), flush=True)

    if not audit.all_routes_mapped:
        print("\nDRIFT DETECTED: New routes lack test coverage.", flush=True)
        return 1

    print("\nAll routes have test coverage.", flush=True)
    return 0


if __name__ == "__main__":
    exit(main())
