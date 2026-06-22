import unittest

from machine_readable_checker.checker import check_rows


def codes(rows):
    return {item.code for item in check_rows(rows).findings}


class CheckerTests(unittest.TestCase):
    def test_valid_table_has_no_findings(self):
        self.assertEqual(codes([["年", "人口"], ["2025", "1234"]]), set())


    def test_checks_headers_and_structure(self):
        result = codes([["年", "年", ""], ["2025", "1"], [], ["2026", "2", "3"]])
        self.assertTrue({"duplicate-header", "missing-header", "inconsistent-columns", "split-table"} <= result)


    def test_checks_decorated_values_and_layout(self):
        result = codes([["年", "人口"], ["令和 7年", "1,200 人"], ["2026", "A  B"]])
        self.assertTrue({"era-only-date", "decorated-number", "layout-whitespace"} <= result)
