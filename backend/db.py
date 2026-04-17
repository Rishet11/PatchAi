import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, Boolean, Float, JSON, ForeignKey

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./patchai.db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

class NodeModel(Base):
    __tablename__ = "nodes"
    
    id = Column(String, primary_key=True, index=True)
    parentId = Column(String, index=True, nullable=True)
    agent = Column(String)
    status = Column(String)
    artifactType = Column(String)
    title = Column(String)
    artifact = Column(String)
    contextDelta = Column(String)
    humanOverride = Column(Boolean, default=False)
    evaluatorFlag = Column(Boolean, default=False)
    timestamp = Column(Float)
    depth = Column(Integer)
    branchId = Column(String, index=True)
    metadata_json = Column("metadata", JSON)

class EdgeModel(Base):
    __tablename__ = "edges"
    
    id = Column(String, primary_key=True, index=True)
    source = Column(String, index=True)
    target = Column(String, index=True)
    type = Column(String)
    animated = Column(Boolean, default=True)

class PolicyRuleModel(Base):
    __tablename__ = "policy_rules"
    
    id = Column(String, primary_key=True, index=True)
    text = Column(String)
    type = Column(String)
    enabled = Column(Boolean, default=True)
    proposer = Column(String)
    timestamp = Column(Float)
    category = Column(String)

class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    nodeId = Column(String, nullable=True)
    operation = Column(String)
    actor = Column(String)
    timestamp = Column(Float)
    success = Column(Boolean, default=True)
    details = Column(String)
    policyCheck = Column(String)

# Initialize Database tables
async def init_db():
    async with engine.begin() as conn:
        # Create all tables (if they don't exist)
        await conn.run_sync(Base.metadata.create_all)

# Dependency to get DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
