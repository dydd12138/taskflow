from pydantic import BaseModel


class NoteResponse(BaseModel):
    project_id: int
    content: str


class NoteUpdate(BaseModel):
    content: str
