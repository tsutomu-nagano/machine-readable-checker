import unittest
from email.message import Message
from importlib import reload
from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient
from openpyxl import Workbook

import machine_readable_checker.api as api_module

app = api_module.app


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
        self.assertIn('id="root"', response.text)
        self.assertIn('type="module"', response.text)

    def test_upload_returns_check_result(self):
        response = self.client.post(
            "/api/check",
            files={"file": ("table.csv", "年,人口（人）\n2025,100\n", "text/csv")},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["filename"], "table.csv")
        self.assertEqual(payload["encoding"], "utf-8")
        self.assertTrue(payload["valid"])
        checks = {item["id"]: item["status"] for item in payload["checks"]}
        self.assertEqual(checks["estat-4-6"], "passed")
        self.assertEqual(checks["estat-2-6"], "not_applicable")
        self.assertEqual(len([key for key in checks if key.startswith("estat-")]), 29)
        self.assertEqual(payload["summary"]["issues_found"], 0)

    def test_upload_accepts_cp932_csv_and_returns_encoding(self):
        response = self.client.post(
            "/api/check",
            files={"file": ("table.csv", "年,人口（人）\n2025,100\n".encode("cp932"), "text/csv")},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["encoding"], "cp932")

    def test_xlsx_header_findings_are_not_attached_to_csv_check_items(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["年", ""])
        sheet.append(["2025", "100"])
        buffer = BytesIO()
        workbook.save(buffer)
        workbook.close()
        buffer.seek(0)

        response = self.client.post(
            "/api/check",
            files={
                "file": (
                    "table.xlsx",
                    buffer.getvalue(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )

        self.assertEqual(response.status_code, 200)
        checks = {item["id"]: item for item in response.json()["checks"]}
        self.assertEqual(checks["estat-2-5"]["status"], "issues_found")
        self.assertEqual(checks["estat-2-5"]["finding_codes"], ["missing-header"])
        self.assertEqual(checks["estat-4-6"]["status"], "not_applicable")
        self.assertEqual(checks["estat-4-6"]["finding_codes"], [])

    def test_xlsx_finding_check_item_uses_excel_reference(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["年", ""])
        sheet.append(["2025", "100"])
        buffer = BytesIO()
        workbook.save(buffer)
        workbook.close()
        buffer.seek(0)

        response = self.client.post(
            "/api/check",
            files={
                "file": (
                    "table.xlsx",
                    buffer.getvalue(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )

        self.assertEqual(response.status_code, 200)
        finding = next(item for item in response.json()["findings"] if item["code"] == "missing-header")
        self.assertEqual(finding["check_item"], "チェック項目２-５ 項目名等を省略していないか")

    def test_url_download_returns_check_result(self):
        headers = Message()
        headers["Content-Type"] = "application/octet-stream"
        with patch(
            "machine_readable_checker.api._download_table",
            return_value={
                "filename": "file-download",
                "headers": headers,
                "content": "年,人口（人）\n2025,100\n".encode(),
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
            files={"file": ("table.csv", "年,人口（人）\n令和 7年,100\n", "text/csv")},
        )
        finding = next(item for item in response.json()["findings"] if item["code"] == "era-only-date")
        self.assertEqual(
            finding["check_item"],
            "チェック項目４-９ e-Stat の時間軸コードの表記、西暦表記又は和暦に西暦の併記がされているか",
        )

    def test_rejects_unsupported_upload(self):
        response = self.client.post("/api/check", files={"file": ("table.txt", b"text", "text/plain")})
        self.assertEqual(response.status_code, 400)

    def test_cors_allowed_origins_can_be_configured(self):
        with patch.dict("os.environ", {"CORS_ALLOWED_ORIGINS": "https://example.pages.dev"}):
            reloaded_api = reload(api_module)
            client = TestClient(reloaded_api.app)
            response = client.options(
                "/api/check-url",
                headers={
                    "Origin": "https://example.pages.dev",
                    "Access-Control-Request-Method": "POST",
                },
            )

        reload(api_module)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "https://example.pages.dev")

    def test_max_upload_mb_can_be_configured(self):
        with patch.dict("os.environ", {"MAX_UPLOAD_MB": "1"}):
            reloaded_api = reload(api_module)
            client = TestClient(reloaded_api.app)
            response = client.post(
                "/api/check",
                files={"file": ("large.csv", b"a" * (1024 * 1024 + 1), "text/csv")},
            )

        reload(api_module)
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json()["detail"], "ファイルは 1 MB 以下にしてください。")
