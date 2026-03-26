from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Setting
from app.schemas import SettingUpdate, SettingResponse

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=list[SettingResponse])
def get_settings(db: Session = Depends(get_db)):
    return db.query(Setting).all()


@router.patch("/{key}", response_model=SettingResponse)
def update_setting(key: str, data: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == key).first()
    
    if setting:
        setting.value = data.value
        setting.updated_at = datetime.now()
    else:
        setting = Setting(key=key, value=data.value)
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    return setting
