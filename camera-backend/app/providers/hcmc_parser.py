"""Parser utilities for HCMC Municipal Traffic Portal AjaxPro endpoints.

Handles parsing AjaxPro DataTable responses and WGS84 geographic coordinate strings.
"""

import re
from typing import Optional, Tuple


class HCMCParser:
    """Parses response formats used by the HCMC traffic portal."""

    @staticmethod
    def clean_ajaxpro_response(text: str) -> str:
        """Parses AjaxPro .NET JavaScript syntax:

        `new Ajax.Web.DataTable([columns], [rows])` into valid JSON `{"_dt":
        [[columns], [rows]]}`.
        """
        tag = "new Ajax.Web.DataTable("
        tag_len = len(tag)
        res = []
        i = 0
        stack = []
        in_str = False
        escape = False
        n = len(text)

        while i < n:
            ch = text[i]
            if in_str:
                res.append(ch)
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_str = False
                i += 1
            else:
                if ch == '"':
                    in_str = True
                    res.append('"')
                    i += 1
                elif text.startswith(tag, i):
                    res.append('{"_dt":[')
                    stack.append("dt")
                    i += tag_len
                elif ch == "(":
                    res.append("(")
                    stack.append("(")
                    i += 1
                elif ch == ")":
                    if stack and stack[-1] == "dt":
                        stack.pop()
                        res.append("]}")
                    elif stack and stack[-1] == "(":
                        stack.pop()
                        res.append(")")
                    else:
                        res.append(")")
                    i += 1
                else:
                    res.append(ch)
                    i += 1
        return "".join(res)

    @staticmethod
    def parse_coordinates(shape_str: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
        """Extracts latitude and longitude from 'POINT(lng lat)' format."""
        if not shape_str:
            return None, None
        match = re.search(r"POINT\s*\(\s*([\d\.]+)\s+([\d\.]+)\s*\)", shape_str)
        if match:
            try:
                lng = float(match.group(1))
                lat = float(match.group(2))
                return lat, lng
            except (ValueError, IndexError):
                pass
        return None, None
