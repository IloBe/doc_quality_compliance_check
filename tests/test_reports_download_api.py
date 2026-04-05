"""API tests for report generation and download routes."""
from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.core.database import get_db


def _client_with_db(test_db_session) -> TestClient:
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_generate_then_download_report_file_success(test_db_session, monkeypatch, tmp_path) -> None:
    """Generate a PDF report and download the created file."""
    monkeypatch.chdir(tmp_path)

    client = _client_with_db(test_db_session)
    try:
        login = client.post(
            "/api/v1/auth/login",
            json={
                "email": "mvp-user@example.invalid",
                "password": "CHANGE_ME_BEFORE_USE",
            },
        )
        assert login.status_code == 200

        generate_response = client.post(
            "/api/v1/reports/generate",
            json={
                "document_id": "doc-report-download-1",
                "report_type": "document_analysis",
                "report_format": "pdf",
                "reviewer_name": "QA Engineer",
            },
        )
        assert generate_response.status_code == 200

        payload = generate_response.json()
        report_id = payload["report_id"]
        file_path = Path(payload["file_path"])

        assert payload["report_format"] == "pdf"
        assert file_path.exists()
        assert file_path.name == f"report_{report_id}.pdf"
        assert file_path.read_bytes().startswith(b"%PDF")

        download_response = client.get(f"/api/v1/reports/download/{report_id}")
        assert download_response.status_code == 200
        assert download_response.headers["content-type"].startswith("application/pdf")
        disposition = download_response.headers.get("content-disposition", "")
        assert "attachment;" in disposition
        assert f'filename="report_{report_id}.pdf"' in disposition
        assert download_response.content.startswith(b"%PDF")
    finally:
        app.dependency_overrides.clear()


def test_download_report_returns_404_for_unknown_report_id(test_db_session, monkeypatch, tmp_path) -> None:
    """Downloading a nonexistent report id should return a 404."""
    monkeypatch.chdir(tmp_path)

    client = _client_with_db(test_db_session)
    try:
        login = client.post(
            "/api/v1/auth/login",
            json={
                "email": "mvp-user@example.invalid",
                "password": "CHANGE_ME_BEFORE_USE",
            },
        )
        assert login.status_code == 200

        response = client.get("/api/v1/reports/download/report-does-not-exist")

        assert response.status_code == 404
        assert response.json()["error"]["message"] == "Report not found"
    finally:
        app.dependency_overrides.clear()


def test_download_report_returns_404_for_malformed_report_id(test_db_session, monkeypatch, tmp_path) -> None:
    """Malformed download IDs should not resolve to artifacts."""
    monkeypatch.chdir(tmp_path)

    client = _client_with_db(test_db_session)
    try:
        login = client.post(
            "/api/v1/auth/login",
            json={
                "email": "mvp-user@example.invalid",
                "password": "CHANGE_ME_BEFORE_USE",
            },
        )
        assert login.status_code == 200

        response = client.get("/api/v1/reports/download/not-a-valid-report-id!!")

        assert response.status_code == 404
        assert response.json()["error"]["message"] == "Report not found"
    finally:
        app.dependency_overrides.clear()


def test_download_report_returns_404_for_stale_report_id_after_file_removed(test_db_session, monkeypatch, tmp_path) -> None:
    """A previously generated report id becomes stale if artifact is removed."""
    monkeypatch.chdir(tmp_path)

    client = _client_with_db(test_db_session)
    try:
        login = client.post(
            "/api/v1/auth/login",
            json={
                "email": "mvp-user@example.invalid",
                "password": "CHANGE_ME_BEFORE_USE",
            },
        )
        assert login.status_code == 200

        generate_response = client.post(
            "/api/v1/reports/generate",
            json={
                "document_id": "doc-report-download-stale",
                "report_type": "document_analysis",
                "report_format": "pdf",
                "reviewer_name": "QA Engineer",
            },
        )
        assert generate_response.status_code == 200
        report_payload = generate_response.json()
        report_id = report_payload["report_id"]
        file_path = Path(report_payload["file_path"])
        assert file_path.exists()

        file_path.unlink()
        assert not file_path.exists()

        response = client.get(f"/api/v1/reports/download/{report_id}")
        assert response.status_code == 404
        assert response.json()["error"]["message"] == "Report not found"
    finally:
        app.dependency_overrides.clear()


def test_download_html_report_sets_text_html_and_attachment_filename(test_db_session, monkeypatch, tmp_path) -> None:
    """HTML report artifacts should return text/html with attachment filename header."""
    monkeypatch.chdir(tmp_path)

    client = _client_with_db(test_db_session)
    try:
        login = client.post(
            "/api/v1/auth/login",
            json={
                "email": "mvp-user@example.invalid",
                "password": "CHANGE_ME_BEFORE_USE",
            },
        )
        assert login.status_code == 200

        reports_dir = Path("reports")
        reports_dir.mkdir(parents=True, exist_ok=True)
        report_id = "manual-html-artifact"
        html_path = reports_dir / f"report_{report_id}.html"
        html_path.write_text("<html><body><h1>Report</h1></body></html>", encoding="utf-8")

        response = client.get(f"/api/v1/reports/download/{report_id}")

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/html")
        disposition = response.headers.get("content-disposition", "")
        assert "attachment;" in disposition
        assert f'filename="report_{report_id}.html"' in disposition
        assert "<h1>Report</h1>" in response.text
    finally:
        app.dependency_overrides.clear()