
def format_spot_id(row: int, col: int) -> str:
    # A=0, B=1, ... and 1=0, 2=1 ...
    # So Row 0, Col 0 -> A1. Row 1, Col 5 -> B6
    row_char = chr(65 + row)
    col_num = col + 1
    return f"{row_char}{col_num}"
