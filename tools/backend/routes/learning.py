"""
WBA99 MSK Analysis - Learning Routes
Handles study materials, blogs, and certification exams
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

from config import db

router = APIRouter(tags=["Learning & Certification"])


# =============================================
# STUDY MATERIAL MODELS
# =============================================

class StudyMaterial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str
    file_url: Optional[str] = None
    file_data: Optional[str] = None
    file_type: str = "pdf"
    file_name: Optional[str] = None
    uploaded_by: str = ""
    uploaded_by_name: Optional[str] = None
    download_count: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class StudyMaterialCreate(BaseModel):
    title: str
    description: str
    category: str
    file_url: Optional[str] = None
    file_data: Optional[str] = None
    file_type: str = "pdf"
    file_name: Optional[str] = None


# =============================================
# BLOG MODELS
# =============================================

class BlogPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    summary: str = ""
    category: str
    tags: List[str] = []
    author_id: str = ""
    author_name: Optional[str] = None
    cover_image: Optional[str] = None
    is_published: bool = False
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None


class BlogPostCreate(BaseModel):
    title: str
    content: str
    summary: str = ""
    category: str
    tags: List[str] = []
    cover_image: Optional[str] = None
    is_published: bool = False


# =============================================
# CERTIFICATION MODELS
# =============================================

class CertificationQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    options: List[str]
    correct_answer: int
    explanation: str = ""
    points: int = 1


class CertificationExam(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str
    duration_minutes: int = 60
    passing_score: int = 70
    questions: List[CertificationQuestion] = []
    is_active: bool = True
    created_by: str = ""
    created_by_name: Optional[str] = None
    attempts_allowed: int = 3
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CertificationExamCreate(BaseModel):
    name: str
    description: str
    category: str
    duration_minutes: int = 60
    passing_score: int = 70
    attempts_allowed: int = 3


class CertificationResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    exam_id: str
    exam_name: str
    user_id: str
    user_name: Optional[str] = None
    score: float
    passed: bool
    answers: List[Dict[str, Any]] = []
    time_taken_seconds: int = 0
    attempt_number: int = 1
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class ExamSubmission(BaseModel):
    user_id: str
    answers: List[int]
    time_taken_seconds: int = 0


# =============================================
# STUDY MATERIAL ROUTES
# =============================================

@router.post("/admin/study-materials", response_model=StudyMaterial)
async def create_study_material(data: StudyMaterialCreate, admin_id: str):
    """Admin uploads study material"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    material = StudyMaterial(
        title=data.title,
        description=data.description,
        category=data.category,
        file_url=data.file_url,
        file_data=data.file_data,
        file_type=data.file_type,
        file_name=data.file_name,
        uploaded_by=admin_id,
        uploaded_by_name=admin.get("name")
    )
    
    await db.study_materials.insert_one(material.dict())
    return material


@router.get("/study-materials", response_model=List[StudyMaterial])
async def get_study_materials(category: Optional[str] = None, skip: int = 0, limit: int = 50):
    """Get all study materials (public)"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    materials = await db.study_materials.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for m in materials:
        m.pop("file_data", None)
    return [StudyMaterial(**m) for m in materials]


@router.get("/study-materials/{material_id}", response_model=StudyMaterial)
async def get_study_material(material_id: str):
    """Get specific study material with full data"""
    material = await db.study_materials.find_one({"id": material_id, "is_active": True})
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found")
    
    await db.study_materials.update_one({"id": material_id}, {"$inc": {"download_count": 1}})
    return StudyMaterial(**material)


@router.put("/admin/study-materials/{material_id}")
async def update_study_material(material_id: str, data: StudyMaterialCreate, admin_id: str):
    """Admin updates study material"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = data.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.study_materials.update_one({"id": material_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Study material not found")
    return {"message": "Study material updated successfully"}


@router.delete("/admin/study-materials/{material_id}")
async def delete_study_material(material_id: str, admin_id: str):
    """Admin deletes study material (soft delete)"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.study_materials.update_one(
        {"id": material_id},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Study material not found")
    return {"message": "Study material deleted successfully"}


# =============================================
# BLOG ROUTES
# =============================================

@router.post("/admin/blogs", response_model=BlogPost)
async def create_blog_post(data: BlogPostCreate, admin_id: str):
    """Admin creates blog post"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    post = BlogPost(
        title=data.title,
        content=data.content,
        summary=data.summary,
        category=data.category,
        tags=data.tags,
        cover_image=data.cover_image,
        author_id=admin_id,
        author_name=admin.get("name"),
        is_published=data.is_published,
        published_at=datetime.utcnow() if data.is_published else None
    )
    
    await db.blog_posts.insert_one(post.dict())
    return post


@router.get("/blogs", response_model=List[BlogPost])
async def get_blog_posts(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """Get published blog posts (public)"""
    query = {"is_published": True}
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    
    posts = await db.blog_posts.find(query).sort("published_at", -1).skip(skip).limit(limit).to_list(limit)
    for p in posts:
        p.pop("content", None)
    return [BlogPost(**p) for p in posts]


@router.get("/blogs/{blog_id}", response_model=BlogPost)
async def get_blog_post(blog_id: str):
    """Get specific blog post with full content"""
    post = await db.blog_posts.find_one({"id": blog_id, "is_published": True})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    await db.blog_posts.update_one({"id": blog_id}, {"$inc": {"views": 1}})
    return BlogPost(**post)


@router.put("/admin/blogs/{blog_id}")
async def update_blog_post(blog_id: str, data: BlogPostCreate, admin_id: str):
    """Admin updates blog post"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.blog_posts.find_one({"id": blog_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    update_data = data.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    if data.is_published and not existing.get("published_at"):
        update_data["published_at"] = datetime.utcnow()
    
    await db.blog_posts.update_one({"id": blog_id}, {"$set": update_data})
    return {"message": "Blog post updated successfully"}


@router.delete("/admin/blogs/{blog_id}")
async def delete_blog_post(blog_id: str, admin_id: str):
    """Admin deletes blog post"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.blog_posts.delete_one({"id": blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return {"message": "Blog post deleted successfully"}


@router.get("/admin/blogs", response_model=List[BlogPost])
async def get_all_blog_posts(admin_id: str, skip: int = 0, limit: int = 50):
    """Admin gets all blog posts including unpublished"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    posts = await db.blog_posts.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [BlogPost(**p) for p in posts]


# =============================================
# CERTIFICATION ROUTES
# =============================================

@router.post("/admin/certifications", response_model=CertificationExam)
async def create_certification_exam(data: CertificationExamCreate, admin_id: str):
    """Admin creates certification exam"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    exam = CertificationExam(
        name=data.name,
        description=data.description,
        category=data.category,
        duration_minutes=data.duration_minutes,
        passing_score=data.passing_score,
        attempts_allowed=data.attempts_allowed,
        created_by=admin_id,
        created_by_name=admin.get("name")
    )
    
    await db.certification_exams.insert_one(exam.dict())
    return exam


@router.get("/certifications", response_model=List[CertificationExam])
async def get_certification_exams(category: Optional[str] = None, skip: int = 0, limit: int = 20):
    """Get active certification exams (public)"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    exams = await db.certification_exams.find(query).skip(skip).limit(limit).to_list(limit)
    for e in exams:
        e["questions"] = []
    return [CertificationExam(**e) for e in exams]


@router.get("/certifications/{exam_id}", response_model=CertificationExam)
async def get_certification_exam(exam_id: str):
    """Get certification exam with questions (for taking exam)"""
    exam = await db.certification_exams.find_one({"id": exam_id, "is_active": True})
    if not exam:
        raise HTTPException(status_code=404, detail="Certification exam not found")
    
    for q in exam.get("questions", []):
        q.pop("correct_answer", None)
        q.pop("explanation", None)
    
    return CertificationExam(**exam)


@router.get("/certifications/name/{exam_name}", response_model=CertificationExam)
async def get_certification_exam_by_name(exam_name: str):
    """Get certification exam by name"""
    exam = await db.certification_exams.find_one({"name": exam_name, "is_active": True})
    if not exam:
        raise HTTPException(status_code=404, detail="Certification exam not found")
    
    for q in exam.get("questions", []):
        q.pop("correct_answer", None)
        q.pop("explanation", None)
    
    return CertificationExam(**exam)


@router.put("/admin/certifications/{exam_id}")
async def update_certification_exam(exam_id: str, data: CertificationExamCreate, admin_id: str):
    """Admin updates certification exam"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = data.dict()
    result = await db.certification_exams.update_one({"id": exam_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Certification exam not found")
    return {"message": "Certification exam updated successfully"}


@router.post("/admin/certifications/{exam_id}/questions")
async def add_certification_question(exam_id: str, question: Dict[str, Any], admin_id: str):
    """Admin adds question to certification exam"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    q = CertificationQuestion(
        question=question.get("question", ""),
        options=question.get("options", []),
        correct_answer=question.get("correct_answer", 0),
        explanation=question.get("explanation", ""),
        points=question.get("points", 1)
    )
    
    result = await db.certification_exams.update_one(
        {"id": exam_id},
        {"$push": {"questions": q.dict()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Certification exam not found")
    return {"message": "Question added successfully", "question_id": q.id}


@router.delete("/admin/certifications/{exam_id}/questions/{question_id}")
async def delete_certification_question(exam_id: str, question_id: str, admin_id: str):
    """Admin removes question from certification exam"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.certification_exams.update_one(
        {"id": exam_id},
        {"$pull": {"questions": {"id": question_id}}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Certification exam not found")
    return {"message": "Question removed successfully"}


@router.delete("/admin/certifications/{exam_id}")
async def delete_certification_exam(exam_id: str, admin_id: str):
    """Admin deletes certification exam (soft delete)"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.certification_exams.update_one(
        {"id": exam_id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Certification exam not found")
    return {"message": "Certification exam deleted successfully"}


@router.post("/certifications/{exam_id}/submit")
async def submit_certification_exam(exam_id: str, submission: ExamSubmission):
    """User submits certification exam"""
    exam = await db.certification_exams.find_one({"id": exam_id, "is_active": True})
    if not exam:
        raise HTTPException(status_code=404, detail="Certification exam not found")
    
    user = await db.users.find_one({"id": submission.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    previous_attempts = await db.certification_results.count_documents({
        "exam_id": exam_id,
        "user_id": submission.user_id
    })
    
    if previous_attempts >= exam.get("attempts_allowed", 3):
        raise HTTPException(status_code=400, detail="Maximum attempts reached")
    
    questions = exam.get("questions", [])
    total_points = sum(q.get("points", 1) for q in questions)
    earned_points = 0
    answers_detail = []
    
    for i, (q, user_ans) in enumerate(zip(questions, submission.answers)):
        correct = q.get("correct_answer", 0) == user_ans
        if correct:
            earned_points += q.get("points", 1)
        answers_detail.append({
            "question_id": q.get("id"),
            "user_answer": user_ans,
            "correct_answer": q.get("correct_answer"),
            "is_correct": correct,
            "explanation": q.get("explanation", "")
        })
    
    score = (earned_points / total_points * 100) if total_points > 0 else 0
    passed = score >= exam.get("passing_score", 70)
    
    result = CertificationResult(
        exam_id=exam_id,
        exam_name=exam.get("name", ""),
        user_id=submission.user_id,
        user_name=user.get("name"),
        score=round(score, 1),
        passed=passed,
        answers=answers_detail,
        time_taken_seconds=submission.time_taken_seconds,
        attempt_number=previous_attempts + 1
    )
    
    await db.certification_results.insert_one(result.dict())
    return result


@router.get("/certifications/results/{user_id}", response_model=List[CertificationResult])
async def get_user_certification_results(user_id: str):
    """Get user's certification results"""
    results = await db.certification_results.find({"user_id": user_id}).sort("completed_at", -1).to_list(100)
    return [CertificationResult(**r) for r in results]
