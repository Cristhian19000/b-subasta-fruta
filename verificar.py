"""Script de verificación del sistema."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'subasta_frutas.settings')
django.setup()

from clientes.models import Cliente
from django.contrib.auth.models import User

print('=== VERIFICACION COMPLETA ===')
print(f'Total clientes: {Cliente.objects.count()}')
print(f'Total usuarios: {User.objects.count()}')
print()

print('--- Estados de clientes ---')
for e in ['habilitado', 'deshabilitado']:
    print(f'  {e}: {Cliente.objects.filter(estado=e).count()}')
print()

print('--- Estatus fichas ---')
for e in ['recepcionado', 'pendiente']:
    print(f'  {e}: {Cliente.objects.filter(estatus_ficha=e).count()}')
print()

print('--- Correos ---')
print(f'  Confirmados: {Cliente.objects.filter(confirmacion_correo=True).count()}')
print(f'  Pendientes: {Cliente.objects.filter(confirmacion_correo=False).count()}')
print()

print('--- Verificar valores invalidos ---')
invalidos_estado = Cliente.objects.exclude(estado__in=['habilitado', 'deshabilitado']).count()
invalidos_estatus = Cliente.objects.exclude(estatus_ficha__in=['recepcionado', 'pendiente']).count()
print(f'  Estados invalidos: {invalidos_estado}')
print(f'  Estatus invalidos: {invalidos_estatus}')
print()

if invalidos_estado > 0 or invalidos_estatus > 0:
    print('!!! HAY DATOS INVALIDOS !!!')
else:
    print('OK - Todos los datos son validos')

print()
print('=== FIN VERIFICACION ===')
