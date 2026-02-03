import re
from typing import List, Dict
try:
    import pdfplumber
except ImportError:
    pdfplumber = None
from docx import Document
try:
    import pytesseract
except ImportError:
    pytesseract = None
from PIL import Image
import io

def parse_special_format(text: str) -> List[Dict]:
    """++++, ====, # bilan ajratilgan maxsus format uchun parser"""
    
    print(f"DEBUG: Maxsus format parser ishga tushdi. Matn uzunligi: {len(text)} belgi")
    
    # Matnni bloklarga ajratish
    blocks = text.split('++++')
    tests = []
    
    for block_num, block in enumerate(blocks):
        block = block.strip()
        if not block:
            continue
            
        print(f"DEBUG: Blok {block_num + 1}: {block[:200]}...")
        
        # Savol va variantlarni ajratish
        parts = block.split('====')
        if len(parts) < 2:
            continue
            
        question = parts[0].strip()
        options = [part.strip() for part in parts[1:]]
        
        # To'g'ri javobni topish (# bilan belgilangan)
        correct_answer = None
        clean_options = []
        
        for i, option in enumerate(options):
            # Agar # bilan boshlanasa, bu to'g'ri javob
            if option.startswith('#'):
                # # belgisini olib tashlash va tozalash
                clean_option = option[1:].strip()
                clean_options.append(clean_option)
                correct_answer = chr(65 + i)  # A, B, C, D
                print(f"DEBUG: To'g'ri javob topildi: {correct_answer} - {clean_option}")
            else:
                clean_options.append(option)
        
        # Agar to'g'ri javob topilmasa, # belgisini qidirish
        if correct_answer is None:
            for i, option in enumerate(clean_options):
                if '#' in option:
                    # # belgisini olib tashlash
                    clean_option = option.replace('#', '').strip()
                    clean_options[i] = clean_option
                    correct_answer = chr(65 + i)
                    print(f"DEBUG: Ichkarida # belgisi topildi: {correct_answer} - {clean_option}")
                    break
        
        # Agar to'g'ri javob topilmasa, variant ichida # belgisini qidirish
        if correct_answer is None:
            for i, option in enumerate(clean_options):
                if option.startswith('#'):
                    clean_option = option[1:].strip()
                    clean_options[i] = clean_option
                    correct_answer = chr(65 + i)
                    print(f"DEBUG: Variant boshida # belgisi topildi: {correct_answer} - {clean_option}")
                    break
        
        # Kamida 2 ta variant bo'lishi kerak
        if question and len(clean_options) >= 2:
            test_data = {
                "question": question,
                "options": clean_options[:4],  # Ko'pi bilan 4 ta variant
                "correct_answer": correct_answer,
                "explanation": None
            }
            
            tests.append(test_data)
            print(f"DEBUG: Test qo'shildi: {question[:50]}... Javob: {correct_answer}")
        else:
            print(f"DEBUG: Blok e'tiborga olinmadi - question: {bool(question)}, options: {len(clean_options)}")
    
    print(f"DEBUG: Maxsus formatdan {len(tests)} ta test topildi")
    return tests

def parse_tests(text: str) -> List[Dict]:
    """Universal test parser - maxsus format va odatiy formatni tushunadi"""
    
    # Debug: Matn uzunligini ko'rish
    print(f"DEBUG: Matn uzunligi: {len(text)} belgi")
    print(f"DEBUG: Matn birinchi 1000 belgi:\n{text[:1000]}")
    
    # Avval maxsus formatni tekshiramiz (++++, ====, #)
    if '++++' in text and '====' in text:
        print("DEBUG: Maxsus format ++++ ==== # topildi, maxsus parser ishga tushirilmoqda...")
        return parse_special_format(text)
    
    # Matnni tozalash - maxsus belgilarni normalizatsiya qilish
    text = re.sub(r'\r\n', '\n', text)  # Windows line endings
    text = re.sub(r'\r', '\n', text)     # Mac line endings
    text = re.sub(r'\n{3,}', '\n\n', text) # Ko'p bo'sh qatorlarni kamaytirish
    
    # Maxsus belgilarni oddiy raqamlarga almashtirish
    text = re.sub(r'(\d+)[️️\u200B-\u200D\u2060\uFEFF]*[\.\)]', r'\1.', text)  # 2️. -> 2.
    text = re.sub(r'(\d+)\s*[️️\u200B-\u200D\u2060\uFEFF]*[\.\)]', r'\1.', text)  # 2 . -> 2.
    
    print(f"DEBUG: Tozalangan matn birinchi 1000 belgi:\n{text[:1000]}")
    
    tests = []
    seen_questions = set()  # Takrorlanishni oldini olish
    
    # Savollarni raqamlar orqali topish - faqat bitta pattern ishlatamiz
    question_pattern = r'(\d+\.\s*)(.+?)(?=\n\d+\.\s*|\n*$)'  # Faqat 1. format
    
    print(f"DEBUG: Pattern ni sinash...")
    questions = re.finditer(question_pattern, text, re.DOTALL | re.IGNORECASE)
    question_list = list(questions)
    print(f"DEBUG: Pattern dan {len(question_list)} ta savol bloki topildi")
    
    for i, match in enumerate(question_list):
        question_number = match.group(1)
        question_content = match.group(2).strip()
        
        print(f"DEBUG: Savol {i+1}: {question_number}")
        print(f"DEBUG: Savol kontenti (birinchi 300 belgi): {question_content[:300]}")
        
        # Savol va variantlarni ajratish
        lines = question_content.split('\n')
        question_text = ""
        options = []
        
        # Qatorlarni bo'lib ajratish
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Agar variant bo'lsa
            if re.match(r'^[A-D][\)\.\s]', line, re.IGNORECASE):
                options.append(line)
            # Agar savol bo'lsa
            elif not question_text:
                question_text = line
            # Agar savolga davom etsa
            elif question_text and len(options) == 0:
                question_text += " " + line
        
        question_text = question_text.strip()
        
        # Variantlarni tozalash
        clean_options = []
        for option in options[:4]:  # Faqat birinchi 4 ta
            option = option.strip()
            # Variant prefiksini olib tashlash
            option = re.sub(r'^[A-D][\)\.\s]\s*', '', option, flags=re.IGNORECASE)
            if option:
                clean_options.append(option)
        
        print(f"DEBUG: Tozalangan variantlar: {clean_options}")
        
        # Agar to'g'ri savol va 4 ta variant bo'lsa
        if question_text and len(clean_options) >= 4:
            # Takrorlanishni tekshirish
            question_hash = question_text[:100]  # Birinchi 100 belgi
            if question_hash in seen_questions:
                print(f"DEBUG: Takroriy savol o'tkazildi: {question_text[:50]}...")
                continue
            
            seen_questions.add(question_hash)
            
            # Har bir test uchun alohida javob aniqlash
            correct_answer = auto_detect_correct_answer_for_question(text, question_text, question_number)
            
            test_data = {
                "question": question_text,
                "options": clean_options[:4],
                "correct_answer": correct_answer,
                "explanation": None
            }
            
            tests.append(test_data)
            print(f"DEBUG: Test qo'shildi: {question_text[:50]}... Javob: {correct_answer}")
        else:
            print(f"DEBUG: Savol e'tiborga olinmadi - question: {bool(question_text)}, options: {len(clean_options)}")
    
    print(f"DEBUG: Jami {len(tests)} ta test topildi")
    
    # Agar testlar yetarli bo'lmasa, oxirgi urinish
    if len(tests) < 5:  # Kamida 5 ta test bo'lishi kerak
        print("DEBUG: Kam test topildi, oxirgi urinish...")
        additional_tests = parse_last_attempt(text)
        
        # Qo'shimcha testlardan takrorlarni olib tashlash
        for test in additional_tests:
            question_hash = test["question"][:100]
            if question_hash not in seen_questions:
                seen_questions.add(question_hash)
                tests.append(test)
        
        print(f"DEBUG: Oxirgi urinishdan keyin jami {len(tests)} ta test")
    
    return tests

def auto_detect_correct_answer_for_question(text: str, question: str, question_number: str) -> str:
    """Har bir savol uchun alohida to'g'ri javobni aniqlash"""
    
    # Savol raqamini olish
    num_match = re.match(r'(\d+)', question_number)
    question_num = num_match.group(1) if num_match else ""
    
    print(f"DEBUG: Savol raqami: {question_num}")
    
    # 1. Savoldan keyin javobni qidirish
    question_start = text.find(question)
    if question_start != -1:
        # Savoldan keyingi 500 belgi
        after_question = text[question_start:question_start + len(question) + 500]
        print(f"DEBUG: Savoldan keyingi matn: {after_question[:200]}")
        
        # Javob patternlari
        patterns = [
            r'to[g\']ri\s*javob\s*[:\-]\s*([A-D])',
            r'correct\s*[:\-]\s*([A-D])',
            r'javob\s*[:\-]\s*([A-D])',
            r'answer\s*[:\-]\s*([A-D])'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, after_question, re.IGNORECASE)
            if match:
                print(f"DEBUG: Savoldan keyin javob topildi: {match.group(1).upper()}")
                return match.group(1).upper()
    
    # 2. Oxirgi javob formatidan shu savol javobini olish: "1 a 2 b 3 c"
    end_pattern = r'(\d+)\s*([A-D])'
    end_matches = re.findall(end_pattern, text, re.IGNORECASE)
    print(f"DEBUG: Oxirgi javob formati: {end_matches}")
    
    if end_matches:
        for num, answer in end_matches:
            if num == question_num:
                print(f"DEBUG: Savol {question_num} uchun javob topildi: {answer.upper()}")
                return answer.upper()
    
    # 3. Butun matnda shu savol raqamli javobni qidirish
    specific_pattern = rf'{question_num}\s*[:\.\-]?\s*([A-D])'
    specific_match = re.search(specific_pattern, text, re.IGNORECASE)
    if specific_match:
        print(f"DEBUG: Maxsus pattern bilan javob topildi: {specific_match.group(1).upper()}")
        return specific_match.group(1).upper()
    
    print(f"DEBUG: Savol {question_num} uchun javob topilmadi")
    return None

def parse_last_attempt(text: str) -> List[Dict]:
    """Oxirgi urinish - eng soddalashtirilgan"""
    tests = []
    
    # Barcha qatorlarni bo'lish
    lines = text.split('\n')
    current_question = ""
    current_options = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Agar raqam bilan boshlansa - yangi savol
        if re.match(r'^\d+[\.\)]', line):
            # Avvalgi savolni saqlash
            if current_question and len(current_options) >= 4:
                correct_answer = auto_detect_correct_answer(text, current_question)
                tests.append({
                    "question": current_question,
                    "options": current_options[:4],
                    "correct_answer": correct_answer,
                    "explanation": None
                })
            
            # Yangi savolni boshlash
            current_question = re.sub(r'^\d+[\.\)]\s*', '', line)
            current_options = []
            
        # Agar variant bo'lsa
        elif re.match(r'^[A-D][\)\.\s]', line, re.IGNORECASE):
            option = re.sub(r'^[A-D][\)\.\s]\s*', '', line, flags=re.IGNORECASE)
            if option and len(current_options) < 4:
                current_options.append(option)
        
        # Agar savolga davom etsa
        elif current_question and not current_question.endswith('?'):
            current_question += " " + line
    
    # Oxirgi savolni ham saqlash
    if current_question and len(current_options) >= 4:
        correct_answer = auto_detect_correct_answer(text, current_question)
        tests.append({
            "question": current_question,
            "options": current_options[:4],
            "correct_answer": correct_answer,
            "explanation": None
        })
    
    print(f"DEBUG: Oxirgi urinish {len(tests)} ta test topildi")
    return tests

def parse_flexible_tests(text: str) -> List[Dict]:
    """Qo'shimcha moslashuvchan test parser"""
    tests = []
    
    # Savollarni raqamlash orqali ajratish
    question_blocks = re.split(r'\n(\d+[\.\)]\s*)', text)
    
    current_question = None
    current_options = []
    question_number = 0
    
    for i, block in enumerate(question_blocks):
        if i % 2 == 1:  # Raqam bloki
            question_number = block
            continue
        
        if i % 2 == 0 and i > 0:  # Savol bloki
            lines = block.strip().split('\n')
            if not lines:
                continue
                
            # Birinchi qator - savol
            question_line = lines[0].strip()
            if not question_line or not re.search(r'[?!.]', question_line):
                continue
            
            # Savol raqamini olib tashlash
            question = re.sub(r'^\d+[\.\)]\s*', '', question_line)
            
            # Variantlarni izlash
            options = []
            option_pattern = r'^[A-D][\)\.\s]\s*(.+)$'
            
            for line in lines[1:]:
                line = line.strip()
                if not line:
                    continue
                    
                match = re.match(option_pattern, line, re.IGNORECASE)
                if match:
                    options.append(match.group(1).strip())
                elif options and len(options) < 4:
                    # Agar variant prefiksi bo'lmasa
                    options.append(line)
            
            # Agar 4 ta variant bo'lsa
            if len(options) >= 4:
                correct_answer = auto_detect_correct_answer(text, question)
                
                tests.append({
                    "question": question,
                    "options": options[:4],
                    "correct_answer": correct_answer,
                    "explanation": None
                })
    
    return tests

def parse_pdf(pdf_content: bytes) -> List[Dict]:
    """PDF fayldan testlarni ajratib olish"""
    if pdfplumber is None:
        print("WARNING: pdfplumber not installed, skipping PDF parsing")
        return []

    text = ""
    with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return parse_tests(text)

def parse_word(docx_content: bytes) -> List[Dict]:
    """Word fayldan testlarni ajratib olish"""
    doc = Document(io.BytesIO(docx_content))
    text = "\n".join([para.text for para in doc.paragraphs])
    return parse_tests(text)

def parse_image(image_content: bytes) -> List[Dict]:
    """Rasmdan OCR orqali matn o'qish"""
    image = Image.open(io.BytesIO(image_content))
    if pytesseract is None:
        print("WARNING: pytesseract not installed, skipping OCR")
        return []
    text = pytesseract.image_to_string(image, lang='eng+rus+uzb')
    return parse_tests(text)

def parse_image_tests(image_content: bytes) -> List[Dict]:
    """Rasmdan matn olib, test tuzishga yuborish"""
    print(f"DEBUG: Rasmdan matn olish boshlandi...")
    
    try:
        # Rasmdan matn olish
        image = Image.open(io.BytesIO(image_content))
        print(f"DEBUG: Rasm hajmi: {image.size}, format: {image.format}")
        
        # Rasmni qayta ishlash
        image = image.convert('L')  # Grayscale
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # OCR bilan matn olish
        if pytesseract is None:
            print("WARNING: pytesseract not installed, skipping OCR")
            text = ""
        else:
            text = pytesseract.image_to_string(image, lang='eng+rus+uzb')
        print(f"DEBUG: OCR bilan matn olingan: {len(text)} belgi")
        print(f"DEBUG: OCR natijasi:\n{text}")
        
        # Matnni tozalash
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Matnni test parseriga yuborish
        tests = parse_tests(text)
        print(f"DEBUG: Test parserga yuborildi, {len(tests)} ta test topildi")
        
        return tests
        
    except Exception as e:
        print(f"ERROR: Rasmdan matn olishda xatolik: {e}")
        return []

def detect_correct_answer_from_image(text: str, question_number: str, question_text: str) -> str:
    """Rasmdan to'g'ri javobni aniqlash"""
    
    # 1. Savoldan keyingi matnda javobni qidirish
    question_start = text.find(question_text)
    if question_start != -1:
        after_question = text[question_start:question_start + len(question_text) + 300]
        
        # Javob belgilarini qidirish
        patterns = [
            r'to[g\']ri\s*javob\s*[:\-]\s*([A-D])',
            r'correct\s*[:\-]\s*([A-D])',
            r'javob\s*[:\-]\s*([A-D])',
            r'answer\s*[:\-]\s*([A-D])',
            r'([A-D])\s*[-–—]\s*to[g\']ri',
            r'([A-D])\s*[-–—]\s*correct',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, after_question, re.IGNORECASE)
            if match:
                answer = match.group(1).upper()
                print(f"DEBUG: Savoldan keyin javob topildi: {answer}")
                return answer
    
    # 2. Savol raqami bilan javobni qidirish: "1. A" yoki "1-A"
    num_match = re.match(r'(\d+)', question_number)
    question_num = num_match.group(1) if num_match else ""
    
    patterns = [
        rf'{question_num}\s*[\.\-]\s*([A-D])',
        rf'{question_num}\s*[:]\s*([A-D])',
        rf'{question_num}\s*([A-D])',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            answer = match.group(1).upper()
            print(f"DEBUG: Savol raqami bilan javob topildi: {answer}")
            return answer
    
    # 3. Belgilangan variantlarni qidirish (checkbox, circle, etc.)
    # Bu qismda rasmni qayta ishlash kerak, hozircha matn asosida
    marked_patterns = [
        r'☑\s*([A-D])',
        r'✓\s*([A-D])',
        r'✔\s*([A-D])',
        r'●\s*([A-D])',
        r'○\s*([A-D])',
    ]
    
    for pattern in marked_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            answer = match.group(1).upper()
            print(f"DEBUG: Belgilangan javob topildi: {answer}")
            return answer
    
    print(f"DEBUG: Javob topilmadi")
    return None

def parse_fallback_image_format(text: str) -> List[Dict]:
    """Qo'shimcha formatlarni sinash"""
    tests = []
    
    # Oddiy variantlar formati
    lines = text.split('\n')
    current_question = ""
    current_options = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Savol formati
        if re.match(r'^\d+[\.\)]', line):
            if current_question and len(current_options) >= 2:
                correct_answer = detect_correct_answer_from_image(text, "", current_question)
                tests.append({
                    "question": current_question,
                    "options": current_options[:4],
                    "correct_answer": correct_answer,
                    "explanation": None
                })
            
            current_question = re.sub(r'^\d+[\.\)]\s*', '', line)
            current_options = []
        
        # Variant formati
        elif re.match(r'^[A-D][\)\.]', line, re.IGNORECASE):
            option = re.sub(r'^[A-D][\)\.]\s*', '', line, flags=re.IGNORECASE)
            if option:
                current_options.append(option)
    
    # Oxirgi savolni qo'shish
    if current_question and len(current_options) >= 2:
        correct_answer = detect_correct_answer_from_image(text, "", current_question)
        tests.append({
            "question": current_question,
            "options": current_options[:4],
            "correct_answer": correct_answer,
            "explanation": None
        })
    
    return tests

def parse_image(image_content: bytes) -> List[Dict]:
    """Rasmdan OCR orqali matn o'qish"""
    image = Image.open(io.BytesIO(image_content))
    if pytesseract is None:
        print("WARNING: pytesseract not installed, skipping OCR")
        return []
    text = pytesseract.image_to_string(image, lang='eng+rus+uzb')
    return parse_tests(text)

def auto_detect_correct_answer(text: str, question: str = None) -> str:
    """To'g'ri javobni avtomatik aniqlash"""
    # Pattern: To'g'ri javob: A yoki Correct: B
    patterns = [
        r'to[g\']ri\s*javob\s*[:\-]\s*([A-D])',
        r'correct\s*[:\-]\s*([A-D])',
        r'javob\s*[:\-]\s*([A-D])',
        r'answer\s*[:\-]\s*([A-D])'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    
    # Agar question berilgan bo'lsa, savoldan keyin javobni qidirish
    if question:
        question_start = text.find(question)
        if question_start != -1:
            # Savoldan keyingi matn (taxminan 200 belgi)
            after_question = text[question_start:question_start + len(question) + 200]
            for pattern in patterns:
                match = re.search(pattern, after_question, re.IGNORECASE)
                if match:
                    return match.group(1).upper()
    
    # Oxirgi javob formatini tekshirish: "1 a 2 b 3 c"
    end_pattern = r'(\d+)\s*([A-D])'
    end_matches = re.findall(end_pattern, text, re.IGNORECASE)
    if end_matches:
        # Oxirgi javobni qaytarish
        return end_matches[-1][1].upper()
    
    return None