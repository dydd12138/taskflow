from datetime import datetime
from pydantic import BaseModel


class ConversationResponse(BaseModel):
    id: int
    context_type: str
    context_id: str
    role: str
    content: str
    tool_calls: str | None
    quoted_message_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    type: str
    id: str
    message: str
    quoted_message_id: int | None = None
