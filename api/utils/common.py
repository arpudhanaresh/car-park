
def format_spot_id(row: int, col: int, floor: str = None) -> str:
    # A=0, B=1, ... and 1=0, 2=1 ...
    # So Row 0, Col 0 -> A1. Row 1, Col 5 -> B6
    row_char = chr(65 + row)
    col_num = col + 1
    spot_label = f"{row_char}{col_num}"
    
    if floor: 
        return f"{floor} - {spot_label}"
    return spot_label
