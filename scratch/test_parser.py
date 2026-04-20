import re

def _parse_questions_from_text(text: str) -> list:
    # Unicode variation selector (U+FE00–FE0F) va keycap combining (U+20E3) larni olib tashlaymiz
    text = re.sub(r'[\uFE00-\uFE0F\u20E3]', '', text)

    questions = []
    # Savollarni raqam bilan boshlanuvchi qatorlar orqali ajratamiz.
    blocks = re.split(r'\n\s*(?=\d+\s*[\.\)]\s*\S)', '\n' + text.strip())
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue

        # Birinchi qator — savol matni
        q_line = re.sub(r'^\d+\s*[\.\)\:\-]\s*', '', lines[0]).strip()
        if not q_line:
            continue

        options = []
        correct_idx = 0
        correct_letter = None

        for line in lines[1:]:
            m_ans = re.match(r'^(javob|answer|to.g.ri|correct)\s*[:\-]\s*([A-Da-d])', line, re.I)
            if m_ans:
                correct_letter = m_ans.group(2).upper()
                continue
            m_opt = re.match(r'^([A-Da-d])[\.)\s]\s*(.+)', line)
            if m_opt:
                options.append(m_opt.group(2).strip())

        if len(options) < 2:
            continue

        if correct_letter:
            correct_idx = ord(correct_letter) - ord('A')
            correct_idx = max(0, min(correct_idx, len(options) - 1))

        while len(options) < 4:
            options.append('')

        questions.append({
            "question_text": q_line,
            "options": options[:4],
            "correct_answer": correct_idx,
        })

    return questions

test_cases = [
    "1. (8+2)^2=?\nA) 100\nB) 20\nC) 10\nD) 40",
    "2. 1/2+1/3=?\nA) 5/6\nB) 2/5\nC) 1/5\nD) 1",
    "(8+2)^2=?\nA) 100\nB) 20", # No number
    "1/2+1/3=?\nA) 5/6\nB) 2/5\nC) 1/5\nD) 1", # No number
]

for i, test in enumerate(test_cases):
    print(f"--- Case {i+1} ---")
    print(f"Input: {test}")
    res = _parse_questions_from_text(test)
    if res:
        print(f"Parsed Question: {res[0]['question_text']}")
    else:
        print("Failed to parse")
