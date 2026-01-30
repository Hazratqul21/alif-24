import re
import json
import logging
from typing import List, Dict, Optional, Any
from fastapi import UploadFile, HTTPException
import docx
from pypdf import PdfReader
import io
import openai
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

class TestBuilderService:
    def __init__(self):
        # Configure OpenAI Client
        self.client = None
        self.deployment_name = None
        
        # 1. Try Standard OpenAI
        if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY and not settings.AZURE_OPENAI_KEY:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
        # 2. Try Azure OpenAI
        elif hasattr(settings, 'AZURE_OPENAI_KEY') and settings.AZURE_OPENAI_KEY:
            from openai import AsyncAzureOpenAI
            self.client = AsyncAzureOpenAI(
                api_key=settings.AZURE_OPENAI_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION or "2023-05-15",
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
            )
            self.deployment_name = settings.AZURE_OPENAI_DEPLOYMENT_NAME or "gpt-35-turbo"

    async def parse_file(self, file: UploadFile) -> List[Dict[str, Any]]:
        """
        Parses an uploaded file (docx/pdf) and extracts test questions.
        """
        content = ""
        filename = file.filename.lower()
        
        try:
            file_content = await file.read()
            file_stream = io.BytesIO(file_content)
            
            if filename.endswith('.docx'):
                doc = docx.Document(file_stream)
                content = "\n".join([para.text for para in doc.paragraphs])
            elif filename.endswith('.pdf'):
                reader = PdfReader(file_stream)
                content = "\n".join([page.extract_text() for page in reader.pages])
            else:
                # Try simple text decoding
                content = file_content.decode('utf-8')
                
            return self._parse_text_content(content)
            
        except Exception as e:
            logger.error(f"Error parsing file: {e}")
            raise HTTPException(status_code=400, detail=f"File parsing error: {str(e)}")

    def _parse_text_content(self, text: str) -> List[Dict[str, Any]]:
        """
        Extracts questions from raw text using regex.
        Supports formats:
        1. Question? A) Opt1 B) Opt2 ... [Javob: A]
        """
        questions = []
        # Pre-process text to normalize spacing
        text = text.replace('\r\n', '\n').strip()
        
        # Split by typical question numbering "1.", "2." etc.
        # This regex looks for a number at the start of a line or after a newline
        raw_blocks = re.split(r'\n\d+\s*[.)1]*', '\n' + text)
        
        # The first split might be empty if the text starts with "1."
        if not raw_blocks[0].strip():
            raw_blocks = raw_blocks[1:]
            
        current_id = 1
        
        for block in raw_blocks:
            block = block.strip()
            if not block:
                continue
                
            question_data = self._extract_question_details(block)
            if question_data:
                question_data['id'] = current_id
                questions.append(question_data)
                current_id += 1
                
        return questions

    def _extract_question_details(self, block: str) -> Optional[Dict[str, Any]]:
        """
        Analyzes a text block to find question text, options, and correct answer.
        """
        # Look for "Javob: X" or "Answer: X" at the end
        correct_answer_match = re.search(r'(?:Javob|Answer):\s*([A-Za-z])', block, re.IGNORECASE)
        correct_option_index = None
        if correct_answer_match:
            answer_char = correct_answer_match.group(1).upper()
            # 'A' is 0, 'B' is 1, etc.
            correct_option_index = ord(answer_char) - ord('A')
            # Remove the answer key from the block to clean it up
            block = block[:correct_answer_match.start()].strip()
            
        # Regex to find options like A) ... B) ... or A. ... B. ...
        # We assume options are usually at the end of the block
        # Pattern: look for A) or A. followed by content, then B) or B. etc.
        
        # Strategy: Find the FIRST occurrence of A) or A. 
        # Everything before is the question.
        first_option_match = re.search(r'\bA[).]\s', block)
        if not first_option_match:
            # Fallback: maybe it's just a question without options formatted correctly
            return None
            
        question_text = block[:first_option_match.start()].strip()
        options_part = block[first_option_match.start():]
        
        # Extract options using regex split
        # This pattern matches any option label like " B) " or " C. "
        # We need to capture the delimiter to know which option it is
        parts = re.split(r'\s([A-E])[).]\s', ' ' + options_part)
        
        # parts[0] is empty or whitespace
        # parts[1] is 'A', parts[2] is text for A
        # parts[3] is 'B', parts[4] is text for B ...
        
        options = []
        option_map = {} # Map 'A' -> index 0
        
        cursor = 1
        idx = 0
        while cursor < len(parts) - 1:
            opt_char = parts[cursor]
            opt_text = parts[cursor+1].strip()
            
            options.append(opt_text)
            option_map[opt_char] = idx
            
            cursor += 2
            idx += 1
            
        # Determine correct answer value
        correct_val = None
        if correct_option_index is not None and 0 <= correct_option_index < len(options):
            # We store the raw string of the correct option? Or just the text?
            # existing model uses string. Let's return the text value.
            # But frontend might prefer index. 
            # The prompt says: "to'g'ri javoblarni kiritadi... AI to'g'ri javoblarni avtomatik belgilab ketadi"
            # Let's return the text of the correct option.
            correct_val = options[correct_option_index]
            
        return {
            "question": question_text,
            "type": "multiple_choice",
            "options": options,
            "correct_answer": correct_val,
            "points": 5  # Default points
        }

    async def generate_ai_test(self, prompt_text: str, count: int = 10, difficulty: str = "medium") -> List[Dict[str, Any]]:
        """
        Generates test questions using OpenAI (or Mock if no key).
        prompt_text: User's instruction (e.g. "Trigonometry 10 questions") or just a topic.
        """
        
        if not self.client:
             # MOCK RESPONSE for testing without API Key
            return self._mock_ai_response(prompt_text, count)

        system_prompt = """
        You are a helpful assistant that generates educational tests in JSON format.
        Language: Uzbek (O'zbek).
        Output Format: A JSON array of objects.
        Schema:
        [
            {
                "question": "Question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option B content"
            }
        ]
        ENSURE "correct_answer" is exactly one of the strings in "options".
        """
        
        user_prompt = f"""
        Generate multiple-choice questions based on this request: "{prompt_text}".
        If the request specifies counts (e.g. "10 Math, 5 History"), follow that distribution.
        If not specified, generate approximately {count} questions.
        Difficulty: {difficulty}.
        """

        try:
            model_name = "gpt-3.5-turbo"
            if self.deployment_name:
                model_name = self.deployment_name # Azure uses deployment name as model
                
            response = await self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            # Try to parse JSON from Markdown code block if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            data = json.loads(content)
            
            # Format for our frontend/model
            formatted_questions = []
            for idx, item in enumerate(data):
                formatted_questions.append({
                    "id": idx + 1,
                    "question": item["question"],
                    "type": "multiple_choice",
                    "options": item["options"],
                    "correct_answer": item["correct_answer"],
                    "points": 5
                })
                
            return formatted_questions
            
        except Exception as e:
            logger.error(f"AI Generation failed: {e}")
            raise HTTPException(status_code=500, detail="AI generation failed")

    def _mock_ai_response(self, prompt_text: str, count: int) -> List[Dict[str, Any]]:
        # Simple mock generator
        questions = []
        # Try to parse count from prompt if possible, otherwise use count arg
        # Very basic mock logic
        
        topics = prompt_text.split(',')
        
        current_id = 1
        for topic_part in topics:
            # Mock split for "10 history"
            part_count = count // len(topics) if len(topics) > 0 else count
            
            for i in range(part_count):
                questions.append({
                    "id": current_id,
                    "question": f"AI savol: {topic_part.strip()} haqida #{i+1}?",
                    "type": "multiple_choice",
                    "options": ["Variant A", "Variant B", "Variant C", "Variant D"],
                    "correct_answer": "Variant A",
                    "points": 5
                })
                current_id += 1
        return questions

test_builder_service = TestBuilderService()
