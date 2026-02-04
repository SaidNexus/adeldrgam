from pydantic import BaseModel, Field

class CommentUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1)
