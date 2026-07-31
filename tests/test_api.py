import unittest
from email.message import Message
from unittest.mock import patch

from fastapi.testclient import TestClient

from machine_readable_checker.api import app


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_web_ui_is_served(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("機械判読可能性チェッカー", response.text)

    def test_upload_returns_check_result(self):
        response = self.client.post(
            "/api/check",
            files={"file": ("table.csv", "年,人口\n2025,100\n", "text/csv")},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["filename"], "table.csv")
        self.assertTrue(payload["valid"])
        checks = {item["id"]: item["status"] for item in payload["checks"]}
        self.assertEqual(checks["headers"], "passed")
        self.assertEqual(checks["xlsx-formulas"], "not_applicable")
        self.assertEqual(payload["summary"]["issues_found"], 0)

    def test_url_download_returns_check_result(self):
        headers = Message()
        headers["Content-Type"] = "application/octet-stream"
        with patch(
            "machine_readable_checker.api._download_table",
            return_value={
                "filename": "file-download",
                "headers": headers,
                "content": b"\xe5\xb9\xb4,\xe4\xba\xba\xe5\x8f\xa3\n2025,100\n",
            },
        ):
            response = self.client.post(
                "/api/check-url",
                json={
                    "url": "https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040387904&fileKind=0"
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["filename"], "file-download")
        self.assertEqual(
            payload["source_url"],
            "https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040387904&fileKind=0",
        )
        self.assertTrue(payload["valid"])

    def test_rejects_non_estat_download_url(self):
        response = self.client.post("/api/check-url", json={"url": "https://example.com/table.csv"})
        self.assertEqual(response.status_code, 400)

    def test_findings_include_a_japanese_e_stat_check_item(self):
        response = self.client.post(
            "/api/check",
            files={"file": ("table.csv", "年,人口\n令和 7年,100\n", "text/csv")},
        )
        finding = next(item for item in response.json()["findings"] if item["code"] == "era-only-date")
        self.assertEqual(
            finding["check_item"],
            "チェック項目２-10 西暦表記又は和暦に西暦の併記がされているか",
        )

    def test_rejects_unsupported_upload(self):
        response = self.client.post("/api/check", files={"file": ("table.txt", b"text", "text/plain")})
        self.assertEqual(response.status_code, 400)
