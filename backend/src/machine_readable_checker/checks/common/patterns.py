from __future__ import annotations

import re


FORBIDDEN_LAYOUT = re.compile(r"[\r\n]| {2,}")
DEPENDENT_WORDS = re.compile(r"[①②③④⑤⑥⑦⑧⑨⑩㈱㈲㍾㍽㍼㍻]")
NUMERIC_WITH_DECORATION = re.compile(r"^\s*[+-]?[0-9][0-9, ]*(?:\.[0-9]+)?\s*(?:[%％円人件戸本個台㎏kg\*†])\s*$")
NUMERIC_LIKE = re.compile(r"^\s*[+-]?[0-9][0-9, ]*(?:\.[0-9]+)?\s*$")
SPECIAL_SYMBOL = re.compile(r"^(?:\*\*\*|X)$")
ERA_ONLY = re.compile(r"^(?:令和|平成|昭和|大正|明治)\s*\d+(?:年)?$")
UNIT_WORDS = re.compile(r"(?:数|量|額|率|割合|人口|面積|密度|単価|金額|価格|本数|件数|人数|戸数)$")
UNIT_MARK = re.compile(r"[（(].+[）)]")
AREA_HEADER = re.compile(r"(?:都道府県|市区町村|地域|所在地|住所)")

AREA_ABBREVIATIONS = {
    "青森",
    "岩手",
    "宮城",
    "秋田",
    "山形",
    "福島",
    "茨城",
    "栃木",
    "群馬",
    "埼玉",
    "千葉",
    "神奈川",
    "新潟",
    "富山",
    "石川",
    "福井",
    "山梨",
    "長野",
    "岐阜",
    "静岡",
    "愛知",
    "三重",
    "滋賀",
    "京都",
    "大阪",
    "兵庫",
    "奈良",
    "和歌山",
    "鳥取",
    "島根",
    "岡山",
    "広島",
    "山口",
    "徳島",
    "香川",
    "愛媛",
    "高知",
    "福岡",
    "佐賀",
    "長崎",
    "熊本",
    "大分",
    "宮崎",
    "鹿児島",
    "沖縄",
}
