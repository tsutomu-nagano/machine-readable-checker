import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from openpyxl import Workbook

from machine_readable_checker.checker import check_file, check_rows


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

    def test_reads_xlsx_with_openpyxl_and_detects_workbook_features(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "table.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(["年", "人口"])
            sheet.append(["2025", "100"])
            sheet["C1"] = "結合項目"
            sheet.merge_cells("C1:D1")
            sheet["B2"] = "=50+50"
            workbook.save(path)
            workbook.close()

            result = check_file(path)

        self.assertTrue({"merged-cells", "formulas"} <= {item.code for item in result.findings})

    def test_findings_include_the_cell_value(self):
        findings = check_rows([["年", "人口"], ["令和 7年", "1,200 人"]]).findings
        values_by_code = {finding.code: finding.value for finding in findings}
        self.assertEqual(values_by_code["era-only-date"], "令和 7年")
        self.assertEqual(values_by_code["decorated-number"], "1,200 人")
