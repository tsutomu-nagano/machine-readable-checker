import unittest

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
        self.assertEqual(response.json()["filename"], "table.csv")
        self.assertTrue(response.json()["valid"])

    def test_rejects_unsupported_upload(self):
        response = self.client.post("/api/check", files={"file": ("table.txt", b"text", "text/plain")})
        self.assertEqual(response.status_code, 400)
