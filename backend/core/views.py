from django.shortcuts import render
from django.http import JsonResponse
import time

def get_server_time(request):
    return JsonResponse({
        'server_time_ms' :int(time.time() * 1000)
    })
