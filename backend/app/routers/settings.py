import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Setting
from app.schemas import SettingUpdate, SettingResponse

router = APIRouter(prefix="/settings", tags=["settings"])


def _get_setting(key: str, db: Session, default=""):
    row = db.query(Setting).filter(Setting.key == key).first()
    if not row:
        return default
    try:
        return json.loads(row.value)
    except Exception:
        return row.value


def _get_provider_cfg(db: Session, provider_name: str | None = None):
    """Return (provider, api_key, model, base_url, proxy) for a given or active provider."""
    active = _get_setting("ai_provider", db, "Anthropic")
    provider = provider_name or active
    configs_raw = _get_setting("ai_providers_config", db, "{}")
    try:
        configs = json.loads(configs_raw) if isinstance(configs_raw, str) else configs_raw
    except Exception:
        configs = {}
    if not isinstance(configs, dict):
        configs = {}
    cfg = configs.get(provider, {})
    return (
        provider,
        cfg.get("api_key", ""),
        cfg.get("model", ""),
        cfg.get("base_url", ""),
        cfg.get("proxy", ""),
    )


def _make_http_client(proxy_url: str):
    if not proxy_url:
        return None
    import httpx
    try:
        return httpx.Client(proxy=proxy_url)
    except TypeError:
        return httpx.Client(proxies={"http://": proxy_url, "https://": proxy_url})


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


@router.get("/models")
def list_models(provider: str = Query(None), db: Session = Depends(get_db)):
    """Fetch available models from the provider's API."""
    prov, api_key, model, base_url, proxy = _get_provider_cfg(db, provider)

    if not api_key and prov != "Ollama":
        raise HTTPException(status_code=400, detail="未填写 API Key")

    http_client = _make_http_client(proxy)

    if prov == "Anthropic":
        try:
            import anthropic
            kwargs = {"api_key": api_key, "timeout": 15.0}
            if base_url:
                kwargs["base_url"] = base_url
            if http_client:
                kwargs["http_client"] = http_client
            client = anthropic.Anthropic(**kwargs)
            resp = client.models.list(limit=100)
            return {"models": [m.id for m in resp.data]}
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))
    else:
        try:
            import openai
            kwargs = {"api_key": api_key or "ollama", "timeout": 15.0}
            if base_url:
                kwargs["base_url"] = base_url
            if http_client:
                kwargs["http_client"] = http_client
            client = openai.OpenAI(**kwargs)
            resp = client.models.list()
            ids = sorted(m.id for m in resp.data)
            return {"models": ids}
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))


@router.post("/test-connection")
async def test_connection(db: Session = Depends(get_db)):
    """Test the currently configured AI provider connection."""
    provider, api_key, model, base_url, proxy = _get_provider_cfg(db)

    if not api_key and provider != "Ollama":
        return {"success": False, "message": "未填写 API Key"}
    if not model:
        return {"success": False, "message": "未填写模型名称"}

    http_client = _make_http_client(proxy)

    if provider == "Anthropic":
        try:
            import anthropic
            kwargs = {"api_key": api_key, "timeout": 8.0}
            if base_url:
                kwargs["base_url"] = base_url
            if http_client:
                kwargs["http_client"] = http_client
            client = anthropic.Anthropic(**kwargs)
            client.messages.create(
                model=model,
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )
            return {"success": True, "message": f"连接成功（{provider} / {model}）"}
        except anthropic.AuthenticationError:
            return {"success": False, "message": "API Key 无效"}
        except anthropic.APITimeoutError:
            return {"success": False, "message": "连接超时，请检查网络或代理地址"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    else:
        try:
            import openai
            kwargs = {"api_key": api_key or "ollama", "timeout": 8.0}
            if base_url:
                kwargs["base_url"] = base_url
            if http_client:
                kwargs["http_client"] = http_client
            client = openai.OpenAI(**kwargs)
            client.chat.completions.create(
                model=model,
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )
            return {"success": True, "message": f"连接成功（{provider} / {model}）"}
        except openai.AuthenticationError:
            return {"success": False, "message": "API Key 无效"}
        except openai.APITimeoutError:
            return {"success": False, "message": "连接超时，请检查代理地址或 API 地址"}
        except Exception as e:
            return {"success": False, "message": str(e)}
