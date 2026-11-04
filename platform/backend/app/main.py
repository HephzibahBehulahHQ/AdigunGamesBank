import asyncio, base64, hashlib, hmac, json, os, re, secrets, time, uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Literal

from sqlalchemy.exc import IntegrityError
from starlette.responses import JSONResponse
from .providers import LABELS, PROVIDERS, compete, provider_status, provider_ready
from .judging import judge_status, match_ranking, score_answers, scoring_policy
from .evaluation import validate_cases

from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, create_engine, select, func, inspect, text, update, delete
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session

if os.getenv("APP_ENV") == "production":
    configured_secret = os.getenv("JWT_SECRET", "")
    if len(configured_secret) < 32 or "replace-" in configured_secret.lower() or configured_secret == "local-development-secret-change-this":
        raise RuntimeError("Production requires a unique JWT_SECRET of at least 32 characters")

ROOT=Path(__file__).resolve().parent
DB_URL=os.getenv("DATABASE_URL",f"sqlite:///{ROOT/'gamebank.db'}")
connect_args={"check_same_thread":False} if DB_URL.startswith("sqlite") else {}
engine=create_engine(DB_URL,connect_args=connect_args,pool_pre_ping=True)
SessionLocal=sessionmaker(bind=engine,expire_on_commit=False)
class Base(DeclarativeBase): pass
class User(Base):
    __tablename__="users"
    id:Mapped[int]=mapped_column(Integer,primary_key=True); email:Mapped[str]=mapped_column(String(254),unique=True,index=True); display_name:Mapped[str]=mapped_column(String(80)); password_hash:Mapped[str]=mapped_column(String(256)); role:Mapped[str]=mapped_column(String(16),default="player"); created_at:Mapped[datetime]=mapped_column(DateTime,default=lambda:datetime.now(timezone.utc))
class Model(Base):
    __tablename__="models"
    id:Mapped[int]=mapped_column(Integer,primary_key=True); key:Mapped[str]=mapped_column(String(50),unique=True); label:Mapped[str]=mapped_column(String(80)); provider:Mapped[str]=mapped_column(String(30)); enabled:Mapped[bool]=mapped_column(Boolean,default=True)
class Match(Base):
    __tablename__="matches"
    id:Mapped[str]=mapped_column(String(36),primary_key=True); user_id:Mapped[int]=mapped_column(ForeignKey("users.id")); prompt:Mapped[str]=mapped_column(Text); task_type:Mapped[str]=mapped_column(String(20)); mode:Mapped[str]=mapped_column(String(20)); created_at:Mapped[datetime]=mapped_column(DateTime,default=lambda:datetime.now(timezone.utc))
class Response(Base):
    __tablename__="responses"
    id:Mapped[int]=mapped_column(Integer,primary_key=True); match_id:Mapped[str]=mapped_column(ForeignKey("matches.id"),index=True); model_key:Mapped[str]=mapped_column(String(50)); body:Mapped[str]=mapped_column(Text); latency_ms:Mapped[float]=mapped_column(Float); state:Mapped[str]=mapped_column(String(20)); error:Mapped[Optional[str]]=mapped_column(Text,nullable=True)
class Score(Base):
    __tablename__="scores"
    id:Mapped[int]=mapped_column(Integer,primary_key=True); match_id:Mapped[str]=mapped_column(ForeignKey("matches.id"),index=True); model_key:Mapped[str]=mapped_column(String(50)); accuracy:Mapped[Optional[float]]=mapped_column(Float,nullable=True); final_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); source:Mapped[str]=mapped_column(String(24)); rating:Mapped[Optional[int]]=mapped_column(Integer,nullable=True)
    details_json:Mapped[Optional[str]]=mapped_column(Text,nullable=True)
class ArenaLease(Base):
    __tablename__="arena_leases"
    user_id:Mapped[int]=mapped_column(Integer,primary_key=True)
    match_id:Mapped[str]=mapped_column(String(36),unique=True)
    started_at:Mapped[float]=mapped_column(Float)
class AdmissionLock(Base):
    __tablename__="arena_admission_lock"
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    touched:Mapped[float]=mapped_column(Float)
class Audit(Base):
    __tablename__="audit_log"
    id:Mapped[int]=mapped_column(Integer,primary_key=True); actor_id:Mapped[Optional[int]]=mapped_column(Integer,nullable=True); action:Mapped[str]=mapped_column(String(60)); subject:Mapped[str]=mapped_column(String(120)); created_at:Mapped[datetime]=mapped_column(DateTime,default=lambda:datetime.now(timezone.utc))
class IQRun(Base):
    __tablename__="iq_runs"
    id:Mapped[str]=mapped_column(String(36),primary_key=True); user_id:Mapped[int]=mapped_column(ForeignKey("users.id")); difficulty:Mapped[int]=mapped_column(Integer,default=2); question_no:Mapped[int]=mapped_column(Integer,default=0); score:Mapped[int]=mapped_column(Integer,default=0); categories:Mapped[str]=mapped_column(Text,default="{}"); finished:Mapped[bool]=mapped_column(Boolean,default=False); seed:Mapped[int]=mapped_column(Integer)
Base.metadata.create_all(engine)
with engine.begin() as conn:
    columns = {column["name"] for column in inspect(conn).get_columns("scores")}
    for name, kind in (("rating", "INTEGER"), ("details_json", "TEXT")):
        if name not in columns:
            conn.execute(text(f"ALTER TABLE scores ADD COLUMN {name} {kind}"))
with SessionLocal() as db:
    for key, provider in PROVIDERS.items():
        if not db.scalar(select(Model).where(Model.key == key)):
            db.add(Model(key=key, label=provider.label, provider=key, enabled=True))
    if db.get(AdmissionLock, 1) is None:
        db.add(AdmissionLock(id=1, touched=0))
    db.commit()

app=FastAPI(title="Hephzibah Behulah Game Platform API",version="1.1.0")
app.add_middleware(CORSMiddleware,allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS","http://localhost:3000").split(",") if origin.strip()],allow_credentials=True,allow_methods=["GET","POST"],allow_headers=["Authorization","Content-Type"])
class BoundedRequestBody:
    """Limit streamed input before JSON parsing, including chunked requests."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in {"POST", "PUT", "PATCH"}:
            return await self.app(scope, receive, send)
        body = bytearray()
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            body.extend(event.get("body", b""))
            if len(body) > 65_536:
                return await JSONResponse({"detail": "Request body exceeds 64 KiB"}, status_code=413)(scope, receive, send)
            if not event.get("more_body", False):
                break
        sent = False
        async def bounded_receive():
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()
        await self.app(scope, bounded_receive, send)

app.add_middleware(BoundedRequestBody)

def get_db():
    with SessionLocal() as db: yield db

def b64(x:bytes)->str:return base64.urlsafe_b64encode(x).decode().rstrip("=")
def pw_hash(password:str)->str:
    salt=secrets.token_bytes(16); rounds=310000; digest=hashlib.pbkdf2_hmac("sha256",password.encode(),salt,rounds)
    return f"pbkdf2_sha256${rounds}${b64(salt)}${b64(digest)}"
def pw_ok(password:str,stored:str)->bool:
    try: _,rounds,salt,digest=stored.split("$"); candidate=hashlib.pbkdf2_hmac("sha256",password.encode(),base64.urlsafe_b64decode(salt+"=="),int(rounds)); return hmac.compare_digest(b64(candidate),digest)
    except Exception:return False
def token_for(user:User)->str:
    secret=os.getenv("JWT_SECRET","local-development-secret-change-this")
    if os.getenv("APP_ENV")=="production" and secret=="local-development-secret-change-this": raise HTTPException(503,"JWT_SECRET must be configured")
    header=b64(b'{"alg":"HS256","typ":"JWT"}'); payload=b64(json.dumps({"sub":user.id,"role":user.role,"exp":int(time.time())+43200}).encode()); sig=b64(hmac.new(secret.encode(),f"{header}.{payload}".encode(),hashlib.sha256).digest()); return f"{header}.{payload}.{sig}"
def current_user(authorization:str=Header(default=""),db:Session=Depends(get_db))->User:
    if not authorization.startswith("Bearer "): raise HTTPException(401,"Sign in required")
    try:
        head,pay,sig=authorization[7:].split(".")
        if json.loads(base64.urlsafe_b64decode(head+"==")) != {"alg":"HS256","typ":"JWT"}: raise ValueError()
        secret=os.getenv("JWT_SECRET","local-development-secret-change-this"); expected=b64(hmac.new(secret.encode(),f"{head}.{pay}".encode(),hashlib.sha256).digest())
        if not hmac.compare_digest(sig,expected): raise ValueError()
        data=json.loads(base64.urlsafe_b64decode(pay+"=="));
        if data["exp"]<time.time(): raise ValueError()
        user=db.get(User,int(data["sub"]))
        if not user: raise ValueError()
        return user
    except Exception: raise HTTPException(401,"Session expired or invalid")
def admin_user(user:User=Depends(current_user))->User:
    if user.role!="admin": raise HTTPException(403,"Admin access required")
    return user

class RegisterIn(BaseModel): email:EmailStr; password:str=Field(min_length=12,max_length=128); display_name:str=Field(min_length=2,max_length=80)
class LoginIn(BaseModel): email:EmailStr; password:str=Field(min_length=1,max_length=128)
class BootstrapIn(RegisterIn): bootstrap_token:str
class ArenaIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt:str=Field(min_length=12,max_length=8000)
    task_type:Literal["factual", "creative", "coding"]="factual"
    tests:list[dict]=Field(default_factory=list,max_length=25)
    providers:list[str]=Field(default_factory=lambda:list(PROVIDERS),min_length=2,max_length=8)

    @field_validator("prompt")
    @classmethod
    def meaningful_prompt(cls, value):
        value = value.strip()
        if len(value) < 12:
            raise ValueError("Write at least 12 non-padding characters")
        return value

    @field_validator("providers")
    @classmethod
    def known_providers(cls, value):
        if len(value) != len(set(value)) or any(key not in PROVIDERS for key in value):
            raise ValueError("Choose unique providers from the supported lineup")
        return value
class RateIn(BaseModel): model_key:str; rating:int=Field(ge=1,le=5)

def registration_allowed():
    default = "false" if os.getenv("APP_ENV") == "production" else "true"
    return os.getenv("ALLOW_REGISTRATION", default).lower() == "true"


def enabled_providers(db):
    return {model.key for model in db.scalars(select(Model).where(Model.enabled == True)).all() if model.key in PROVIDERS}


@app.get("/api/health")
def health(db:Session=Depends(get_db)):
    mode = os.getenv("AI_MODE", "disabled").lower()
    enabled = enabled_providers(db)
    states = {key: provider_status(key, key in enabled) for key in PROVIDERS}
    judge = judge_status()
    if judge["provider"] not in enabled:
        judge["configured"] = False
    return {"ok": True, "service": "game-platform-api", "ai_mode": mode,
            "providers": {key: value["configured"] for key, value in states.items()},
            "provider_details": states, "judge": judge,
            "registration_allowed": registration_allowed(), "scoring": scoring_policy()}
@app.post("/api/auth/register")
def register(data:RegisterIn,db:Session=Depends(get_db)):
    if not registration_allowed():
        raise HTTPException(403,"Account registration is disabled by the gateway operator")
    email=str(data.email).lower()
    if db.scalar(select(User).where(User.email==email)): raise HTTPException(409,"Email already registered")
    user=User(email=email,display_name=data.display_name,password_hash=pw_hash(data.password),role="player"); db.add(user); db.commit(); db.refresh(user)
    db.add(Audit(actor_id=user.id,action="register",subject=email));db.commit()
    return {"token":token_for(user),"user":{"id":user.id,"email":user.email,"display_name":user.display_name,"role":user.role}}
@app.post("/api/auth/bootstrap-admin")
def bootstrap_admin(data:BootstrapIn,db:Session=Depends(get_db)):
    configured=os.getenv("ADMIN_EMAIL","").lower(); expected=os.getenv("ADMIN_BOOTSTRAP_TOKEN","")
    if not configured or not expected or str(data.email).lower()!=configured or not hmac.compare_digest(data.bootstrap_token,expected): raise HTTPException(403,"Admin bootstrap is not configured for this account")
    if db.scalar(select(User).where(User.role=="admin")): raise HTTPException(409,"An admin is already initialized")
    user=User(email=configured,display_name=data.display_name,password_hash=pw_hash(data.password),role="admin");db.add(user);db.commit();db.refresh(user);db.add(Audit(actor_id=user.id,action="bootstrap_admin",subject=configured));db.commit()
    return {"token":token_for(user),"user":{"id":user.id,"email":user.email,"display_name":user.display_name,"role":user.role}}
@app.post("/api/auth/login")
def login(data:LoginIn,db:Session=Depends(get_db)):
    user=db.scalar(select(User).where(User.email==str(data.email).lower()))
    if not user or not pw_ok(data.password,user.password_hash): raise HTTPException(401,"Email or password is incorrect")
    return {"token":token_for(user),"user":{"id":user.id,"email":user.email,"display_name":user.display_name,"role":user.role}}
@app.get("/api/me")
def me(user:User=Depends(current_user)):return {"id":user.id,"email":user.email,"display_name":user.display_name,"role":user.role}
@app.get("/api/me/dashboard")
def dashboard(user:User=Depends(current_user),db:Session=Depends(get_db)):
    total=db.scalar(select(func.count(Match.id)).where(Match.user_id==user.id)) or 0; wins=db.scalar(select(func.count(Score.id)).join(Match,Match.id==Score.match_id).where(Match.user_id==user.id,Score.rating>=4)) or 0
    recent=db.scalars(select(Match).where(Match.user_id==user.id).order_by(Match.created_at.desc()).limit(10)).all()
    return {"matches":total,"strong_answers":wins,"recent":[{"id":m.id,"task_type":m.task_type,"mode":m.mode,"created_at":m.created_at.isoformat()} for m in recent]}

# Admission is reserved in the database before any chargeable provider request.
# A single lock-row UPDATE serializes admission in SQLite and PostgreSQL.
def reserve_match(data, user, db):
    now = time.time()
    db.execute(update(AdmissionLock).where(AdmissionLock.id == 1).values(touched=now))
    db.execute(delete(ArenaLease).where(ArenaLease.started_at < now - 180))
    active = db.get(ArenaLease, user.id)
    if active is not None:
        db.rollback()
        raise HTTPException(429, "You already have a match running")
    maximum = max(1, min(32, int(os.getenv("ARENA_MAX_CONCURRENT_MATCHES", "4"))))
    total = db.scalar(select(func.count(ArenaLease.user_id))) or 0
    if total >= maximum:
        db.rollback()
        raise HTTPException(429, "The arena is at capacity. Try again shortly.")
    recent = db.scalar(select(func.count(Match.id)).where(Match.user_id == user.id, Match.created_at >= datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1))) or 0
    if recent >= 3:
        db.rollback()
        raise HTTPException(429, "Arena limit reached. Try again in one minute.")
    record = Match(id=str(uuid.uuid4()), user_id=user.id, prompt=data.prompt, task_type=data.task_type, mode="running")
    db.add(record)
    db.add(ArenaLease(user_id=user.id, match_id=record.id, started_at=now))
    db.commit()
    return record


@app.post("/api/arena/matches")
async def arena_match(data:ArenaIn,user:User=Depends(current_user),db:Session=Depends(get_db)):
    if data.task_type == "coding":
        try:
            validate_cases(data.tests)
        except ValueError as error:
            raise HTTPException(422, str(error))
    elif data.tests:
        raise HTTPException(422, "Test cases apply only to coding matches")
    enabled = enabled_providers(db)
    if os.getenv("AI_MODE", "disabled").lower() != "live" or sum(key in enabled and provider_ready(key) for key in data.providers) < 2:
        raise HTTPException(503, "Configure at least two selected live providers before starting a competition")
    record = reserve_match(data, user, db)
    try:
        # All competitor tasks are scheduled together. Judging starts only after
        # answer latency has been recorded for every provider.
        results = await asyncio.gather(*(compete(key, data.prompt, key in enabled) for key in data.providers))
        await score_answers(results, data.prompt, data.task_type, data.tests, judge_enabled=judge_status()["provider"] in enabled)
        record.mode = "live" if any(result["state"] == "ok" for result in results) else "unavailable"
        for result in results:
            db.add(Response(match_id=record.id, model_key=result["key"], body=result["body"], latency_ms=result["latency_ms"] or 0, state=result["state"], error=result["error"]))
            details = {name: value for name, value in result.items() if name != "body"}
            db.add(Score(match_id=record.id, model_key=result["key"], accuracy=result["accuracy"], final_score=result["final_score"], source=result["source"], details_json=json.dumps(details)))
        db.commit()
        return {"id": record.id, "mode": record.mode, "task_type": record.task_type,
                "responses": results, "ranking": match_ranking(results), "scoring": scoring_policy(),
                "created_at": record.created_at.replace(tzinfo=timezone.utc).isoformat()}
    except BaseException:
        db.rollback()
        record.mode = "interrupted"
        db.add(record)
        db.commit()
        raise
    finally:
        db.execute(delete(ArenaLease).where(ArenaLease.user_id == user.id, ArenaLease.match_id == record.id))
        db.commit()


@app.get("/api/arena/history")
def arena_history(user:User=Depends(current_user),db:Session=Depends(get_db)):
    matches = db.scalars(select(Match).where(Match.user_id == user.id).order_by(Match.created_at.desc()).limit(50)).all()
    history = []
    for match in matches:
        scores = {score.model_key: score for score in db.scalars(select(Score).where(Score.match_id == match.id)).all()}
        responses = []
        for response in db.scalars(select(Response).where(Response.match_id == match.id)).all():
            score = scores.get(response.model_key)
            details = json.loads(score.details_json) if score and score.details_json else {"key": response.model_key, "model": None, "source": score.source if score else "legacy", "final_score": None, "accuracy": score.accuracy if score else None}
            responses.append({**details, "model_key": response.model_key, "body": response.body, "state": response.state, "latency_ms": details.get("latency_ms", response.latency_ms), "rating": score.rating if score else None})
        history.append({"id": match.id, "prompt": match.prompt, "task_type": match.task_type, "mode": match.mode,
                        "created_at": match.created_at.replace(tzinfo=timezone.utc).isoformat(), "responses": responses})
    return history


@app.post("/api/arena/{match_id}/rate")
def rate_answer(match_id:str,data:RateIn,user:User=Depends(current_user),db:Session=Depends(get_db)):
    match=db.get(Match,match_id)
    if not match or match.user_id!=user.id:raise HTTPException(404,"Match not found")
    response=db.scalar(select(Response).where(Response.match_id==match_id,Response.model_key==data.model_key))
    if not response:raise HTTPException(404,"Response not found")
    if response.state!="ok":raise HTTPException(409,"Cannot rate an answer that was not returned by a provider")
    score=db.scalar(select(Score).where(Score.match_id==match_id,Score.model_key==data.model_key))
    if not score:raise HTTPException(404,"Answer score not found")
    score.rating=data.rating
    db.add(Audit(actor_id=user.id,action="rated_ai_answer",subject=f"{match_id}:{data.model_key}:{data.rating}"));db.commit()
    return {"saved":True,"rating":data.rating}
