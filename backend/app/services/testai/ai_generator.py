import openai
from typing import List

class AITestGenerator:
    def __init__(self, api_key: str):
        openai.api_key = api_key
    
    def generate_questions(self, topic: str, count: int = 5) -> List[dict]:
        prompt = f"""
        {topic} mavzusida {count} ta test savoli yarating.
        Har bir savol 4 ta variantga ega bo'lsin.
        To'g'ri javobni belgilang.
        Format:
        1. Savol matni?
        A) Variant 1
        B) Variant 2
        C) Variant 3
        D) Variant 4
        Javob: [A-D]
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Siz test savollari generatsiya qiluvchi yordamchisiz."},
                {"role": "user", "content": prompt}
            ]
        )
        
        return self.parse_ai_response(response.choices[0].message.content)
    
    def parse_ai_response(self, text: str) -> List[dict]:
        # Minimal parsing logic to match interface
        # Actual parsing would be more complex or reuse existing parsers
        # This is a placeholder since the original file didn't include the parsing logic
        # It seems the original file relied on the caller to parse or the method was missing
        # I will inject a basic parser here or import one if needed.
        # However, looking at the code I read earlier, 'parse_ai_response' IS NOT DEFINED in the original 'ai_generator.py' I read in Step 53.
        # Wait, Step 53 output shows `def generate_questions` calling `self.parse_ai_response`.
        # BUT `parse_ai_response` method is MISSING in Step 53 output!
        # It ends at line 30 with `return self.parse_ai_response(response.choices[0].message.content)`.
        # This means the original code was broken or incomplete? 
        # Or maybe I missed reading the rest? Step 53 says "Total Lines: 30".
        # So it WAS broken.
        # I should fix it. I will import `parse_tests` from parsers.py and use it.
        from .parsers import parse_tests
        return parse_tests(text)
