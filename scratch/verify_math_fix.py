import re

def parse_question_simple(text):
    # The refined regex I just deployed
    q_line = re.sub(r'^\d+\s*[\.\)\:\-]\s+(?=\S)', '', text).strip()
    if not q_line:
        # Fallback
        q_line = re.sub(r'^\d+\s*[\.\)]\s*', '', text).strip()
    return q_line

test_cases = [
    "1. (8+2)^2=?",
    "2. 1/2+1/3=?",
    "3) Qaysi biri to'g'ri?",
    "4. 12 + 5 = ?",
    "5/6 + 1/3", # Should NOT strip the 5/
]

print("--- Testing Math Preservation ---")
for tc in test_cases:
    result = parse_question_simple(tc)
    print(f"Input:  {tc}")
    print(f"Output: {result}")
    print("-" * 20)
