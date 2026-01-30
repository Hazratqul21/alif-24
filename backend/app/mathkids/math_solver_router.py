"""
MathKids Solver - Matematik masalalarni yechish va o'rgatish
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from openai import AzureOpenAI
import os
import json

router = APIRouter()

# Request models
class SolveProblemRequest(BaseModel):
    problem: str
    grade_level: int
    topic: Optional[str] = None

class ExplainStepRequest(BaseModel):
    problem: str
    step_number: int
    step_content: str
    question: str

class GenerateSimilarRequest(BaseModel):
    original_problem: str
    grade_level: int
    topic: Optional[str] = None

class ChatRequest(BaseModel):
    problem: str
    solution: str
    question: str

class InteractiveSolveRequest(BaseModel):
    problem: str
    grade_level: int
    current_step: int = 0
    student_answer: Optional[str] = None
    conversation_history: Optional[List[Dict]] = None


def get_azure_client():
    """Azure OpenAI client yaratish"""
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_KEY")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
    
    if not endpoint or not api_key:
        raise HTTPException(status_code=500, detail="Azure OpenAI credentials not configured")
    
    return AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version
    )


@router.post("/solve")
async def solve_math_problem(request: SolveProblemRequest):
    """
    Matematik masalani qadam-baqadam yechish va tushuntirish
    """
    try:
        client = get_azure_client()
        model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
        
        system_prompt = (
            "Siz bog'cha va 1-4 sinf bolalari uchun matematik masalalarni yechadigan o'qituvchisiz. "
            "\n\nMUHIM QOIDALAR:"
            "\n1. Masala qanchalik SODDA bo'lsa, shuncha KAM QADAM"
            "\n2. 1 noma'lum topish = 1 QADAM"
            "\n3. 2 noma'lum topish = 2 QADAM"
            "\n4. EKUK, EKUB, ildiz, kvadrat, kub so'zlarini ISHLATMANG"
            "\n5. Faqat: qo'shish, ayirish, ko'paytirish, bo'lish"
            "\n6. Har qadamda 'expected_answer' maydoni BO'LISHI SHART"
            "\n\nMisol 1 (SODDA):"
            "\nMasala: x = 12, x - y = 3"
            "\nYechim: 1 QADAM - y ni topish"
            "\n\nMisol 2 (QIYIN):"
            "\nMasala: y×y + 8 = 57, x + 2y = 24"
            "\nYechim: 2 QADAM - avval y, keyin x"
            "\n\nJSON format:"
            "\n{"
            '\n  "problem_type": "tur",'
            '\n  "steps": [{'
            '\n    "step_number": 1,'
            '\n    "title": "nom",'
            '\n    "explanation": "tushuntirish",'
            '\n    "example": "misol",'
            '\n    "expected_answer": "javob"'
            '\n  }],'
            '\n  "final_answer": "javob"'
            "\n}"
        )
        
        user_prompt = (
            f"Bolaning yoshi: {request.grade_level}\n"
            f"Masala: {request.problem}\n\n"
            f"Bu masalani bolaga juda sodda tilda tushuntirib ber. Har bir qadamni "
            f"juda oson va qiziqarli qilib tushuntir. JSON formatida javob ber."
        )
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=2000,
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        solution = json.loads(response.choices[0].message.content.strip())
        return {"solution": solution}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error solving problem: {str(e)}")


@router.post("/explain-step")
async def explain_step(request: ExplainStepRequest):
    """
    Konkret qadamni batafsil tushuntirish
    """
    try:
        client = get_azure_client()
        model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
        
        system_prompt = (
            "Siz matematika o'qituvchisisiz. Talaba konkret qadam haqida savol bermoqda. "
            "Qisqa, aniq va tushunarli javob bering. Sodda tilda tushuntiring."
        )
        
        user_prompt = (
            f"Masala: {request.problem}\n"
            f"Qadam {request.step_number}: {request.step_content}\n\n"
            f"Talaba savoli: {request.question}\n\n"
            f"Bu qadamni batafsil tushuntiring."
        )
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        explanation = response.choices[0].message.content.strip()
        return {"explanation": explanation}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error explaining step: {str(e)}")


@router.post("/generate-similar")
async def generate_similar(request: GenerateSimilarRequest):
    """
    O'xshash masala yaratish
    """
    try:
        client = get_azure_client()
        model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
        
        system_prompt = (
            "Siz matematika o'qituvchisisiz. Berilgan masalaga o'xshash, lekin biroz boshqacha "
            "masala yarating. Murakkablik darajasi bir xil bo'lsin."
        )
        
        topic_text = f"Mavzu: {request.topic}\n" if request.topic else ""
        
        user_prompt = (
            f"Sinf darajasi: {request.grade_level}\n"
            f"{topic_text}"
            f"Asl masala: {request.original_problem}\n\n"
            f"Bu masalaga o'xshash yangi masala yarating. Faqat masala matnini yozing."
        )
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=300,
            temperature=0.9
        )
        
        similar_problem = response.choices[0].message.content.strip()
        return {"similar_problem": similar_problem}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating similar problem: {str(e)}")


@router.post("/chat")
async def chat_about_solution(request: ChatRequest):
    """
    Yechim haqida savolga javob berish
    """
    try:
        client = get_azure_client()
        model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
        
        system_prompt = (
            "Siz matematika o'qituvchisisiz. Talaba sizdan yechim haqida savol bermoqda. "
            "Javobingiz qisqa, aniq va tushunarli bo'lsin. Agar talaba tushunmagan bo'lsa, "
            "boshqa usul bilan tushuntirishga harakat qiling. "
            "Yoki xuddi shunga o'xshash boshqa misol keltiring va uni to'liq yechib bering."
        )
        
        user_prompt = (
            f"Masala: {request.problem}\n\n"
            f"Yechim: {request.solution}\n\n"
            f"Talaba savoli: {request.question}\n\n"
            f"Javob bering:"
        )
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        ai_response = response.choices[0].message.content.strip()
        return {"ai_response": ai_response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@router.post("/interactive-solve")
async def interactive_solve(request: InteractiveSolveRequest):
    """
    Interaktiv yechish - AI bolaga masalani yechib bermasdan, 
    qadam-baqadam savol berib, o'zi yechishga yordam beradi
    """
    try:
        client = get_azure_client()
        model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
        
        system_prompt = (
            "Siz bog'cha va 1-4 sinf bolalari bilan ishlaydigan mehribon o'qituvchisiz. "
            "Masalani JUDA SODDA, TUSHINARLI tilda tushuntiring. "
            "\n\nMUHIM QOIDALAR:"
            "\n1. HECH QACHON javobni to'g'ridan-to'g'ri aytmang"
            "\n2. EKUK, EKUB, ildiz, kvadrat, kub kabi murakkab so'zlarni ISHLATMANG"
            "\n3. Oddiy so'zlar: qo'shish, ayirish, ko'paytirish, bo'lish"
            "\n4. Har bir savol JUDA QISQA bo'lsin (1-2 gap)"
            "\n5. Boladan faqat ODDIY SONLARNI kiritishini so'rang (12, 5, 36 kabi)"
            "\n6. Formulalarni yozishni talab QILMANG (k=23+8x kabi)"
            "\n7. Qadamlarni juda sodda tushuntiring"
            "\n8. Agar bola qiynalsa, javobga yaqin yordam bering"
            "\n\nJavob formati (JSON):"
            "\n{"
            '\n  "step_number": 1,'
            '\n  "question": "Qisqa va sodda savol",'
            '\n  "hint": "Sodda maslahat (kerak bo\'lsa)",'
            '\n  "is_correct": true/false,'
            '\n  "feedback": "Qisqa fikr",'
            '\n  "next_step": "keyingi qadamga o\'tish",'
            '\n  "final_answer": "yakuniy javob (oxirgi qadamda)"'
            "\n}"
        )
        
        # Suhbat tarixini shakllantirish
        messages = [{"role": "system", "content": system_prompt}]
        
        if request.conversation_history:
            for item in request.conversation_history:
                messages.append({"role": "user", "content": item.get("user", "")})
                messages.append({"role": "assistant", "content": item.get("assistant", "")})
        
        # Hozirgi so'rovni qo'shish
        if request.student_answer:
            user_prompt = (
                f"Masala: {request.problem}\n"
                f"Bola yoshi: {request.grade_level}\n"
                f"Qadim: {request.current_step}\n"
                f"Bola javobi: {request.student_answer}\n\n"
                f"Bola javobini tekshiring. Agar to'g'ri bo'lsa - rag'batlantiring va keyingi SODDA savolni bering. "
                f"Agar xato bo'lsa - sodda tilda tushuntiring va qaytadan urinishga undang."
            )
        else:
            user_prompt = (
                f"Masala: {request.problem}\n"
                f"Bola yoshi: {request.grade_level}\n\n"
                f"BIRINCHI QADAM: Bolaga masalani JUDA SODDA so'zlar bilan tushuntiring. "
                f"Nimani topish kerakligini so'rang. Faqat ODDIY SONNI kiritishni so'rang. "
                f"Misol: 'Elyor nechta qalamga ega deb o'ylaysan? Oddiy son yoz: 10, 20, 30...'"
            )
        
        messages.append({"role": "user", "content": user_prompt})
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=800,
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content.strip())
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in interactive solving: {str(e)}")
