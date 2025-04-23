from rest_framework.views import APIView

class QwenChat(APIView):
    def post(self, request):
        payload = getattr(request, 'data', request.POST)
        content = payload.get('content', '')
        system_role = payload.get('system_role', '用最温柔的语气回复我的问题')
        model = payload.get('model', 'qwen2.5-1.5b-instruct')
        # ... existing code continues unchanged ... 