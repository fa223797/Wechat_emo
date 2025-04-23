import logging
logger = logging.getLogger(__name__)

from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Application
from . import config

class QwenChatToke(APIView):
    def post(self, request):
        # 入口日志：记录 session_id 和 content
        session_id = request.session.get('session_id')
        logger.info("QwenChatToke 调用开始，session_id=%s", session_id)
        logger.info("请求体 content 大小：%d，前 200 字：%s",
                    len(request.data.get('content', '')),
                    request.data.get('content', '')[:200])

        try:
            # 原有逻辑...
            content = request.data.get('content', '').strip()
            if not content:
                logger.warning("QwenChatToke 输入内容为空")
                return Response({'error': '输入内容不能为空'}, status=400)

            # 如果 session_id 不存在，尝试初始化
            if not session_id:
                if not config.QWEN_API_KEY or not config.QWEN_APP_ID:
                    logger.error("QWEN API 配置缺失: KEY=%s, APP_ID=%s",
                                 config.QWEN_API_KEY, config.QWEN_APP_ID)
                    return Response({'error': 'API 配置缺失'}, status=500)

                init_resp = Application.call(
                    api_key=config.QWEN_API_KEY,
                    app_id = config.QWEN_APP_ID,
                    prompt=' '
                )
                # 校验
                if not getattr(init_resp, 'output', None) or not getattr(init_resp.output, 'session_id', None):
                    logger.error("会话初始化失败，返回: %r", init_resp)
                    return Response({'error': '会话初始化失败'}, status=500)

                session_id = init_resp.output.session_id
                request.session['session_id'] = session_id
                logger.info("新会话ID: %s", session_id)

            # 调用 Qwen 接口
            resp = Application.call(
                api_key=config.QWEN_API_KEY,
                app_id = config.QWEN_APP_ID,
                prompt=content,
                session_id=session_id
            )
            if not getattr(resp, 'output', None) or not getattr(resp.output, 'text', None):
                logger.error("API 响应格式不正确: %r", resp)
                return Response({'error': '无效的API响应'}, status=500)

            return Response({'text': resp.output.text})

        except Exception as e:
            # 完整堆栈日志
            logger.exception("QwenChatToke 执行出错")
            # 返回给前端简要错误
            return Response({'error': f'内部异常，详情请查看服务端日志: {e}'}, status=500) 