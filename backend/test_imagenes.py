"""
Script para probar la funcionalidad de imágenes del módulo de packing.

Ejecutar: python test_imagenes.py
"""

import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'subasta_frutas.settings')
django.setup()

from modulo_packing.models import Empresa, TipoFruta, PackingSemanal, PackingTipo, PackingImagen
from django.core.files.uploadedfile import SimpleUploadedFile
from datetime import date, timedelta


def crear_datos_prueba():
    """Crear datos de prueba si no existen."""
    
    # Crear empresa
    empresa, _ = Empresa.objects.get_or_create(
        nombre="Empresa de Prueba",
        defaults={'activo': True}
    )
    
    # Crear tipo de fruta
    tipo_fruta, _ = TipoFruta.objects.get_or_create(
        nombre="Campo de Prueba",
        defaults={'activo': True}
    )
    
    # Crear packing semanal
    fecha_inicio = date.today() - timedelta(days=date.today().weekday())  # Lunes
    fecha_fin = fecha_inicio + timedelta(days=6)  # Domingo
    
    packing, created = PackingSemanal.objects.get_or_create(
        empresa=empresa,
        fecha_inicio_semana=fecha_inicio,
        defaults={
            'fecha_fin_semana': fecha_fin,
            'estado': 'PROYECTADO'
        }
    )
    
    if created:
        print(f"✓ Packing semanal creado: {packing}")
    else:
        print(f"✓ Packing semanal existente: {packing}")
    
    # Crear tipo dentro del packing
    packing_tipo, created = PackingTipo.objects.get_or_create(
        packing_semanal=packing,
        tipo_fruta=tipo_fruta,
        defaults={'estado': 'ACTIVO'}
    )
    
    if created:
        print(f"✓ Tipo de fruta creado en packing: {packing_tipo}")
    else:
        print(f"✓ Tipo de fruta existente en packing: {packing_tipo}")
    
    return packing, packing_tipo


def probar_modelo_imagenes():
    """Probar el modelo de imágenes."""
    
    print("\n=== PROBANDO MODELO DE IMÁGENES ===\n")
    
    # Crear datos de prueba
    packing, packing_tipo = crear_datos_prueba()
    
    # Contar imágenes existentes
    imagenes_antes = PackingImagen.objects.count()
    print(f"Imágenes antes: {imagenes_antes}")
    
    # No podemos crear imágenes sin archivos reales en este script
    # pero podemos verificar las relaciones
    
    # Verificar que el modelo existe
    print(f"\n✓ Modelo PackingImagen disponible")
    print(f"✓ Campos: {[f.name for f in PackingImagen._meta.fields]}")
    
    # Verificar relaciones
    imagenes_packing = packing.imagenes.all()
    imagenes_tipo = packing_tipo.imagenes.all()
    
    print(f"\n✓ Imágenes del packing: {imagenes_packing.count()}")
    print(f"✓ Imágenes del tipo: {imagenes_tipo.count()}")
    
    # Mostrar algunas imágenes si existen
    if imagenes_packing.exists():
        print("\nImágenes generales del packing:")
        for img in imagenes_packing.filter(packing_tipo__isnull=True)[:3]:
            print(f"  - {img.id}: {img.imagen.name} ({img.descripcion or 'sin descripción'})")
    
    if imagenes_tipo.exists():
        print(f"\nImágenes del tipo {packing_tipo.tipo_fruta.nombre}:")
        for img in imagenes_tipo[:3]:
            print(f"  - {img.id}: {img.imagen.name} ({img.descripcion or 'sin descripción'})")
    
    print("\n✓ Pruebas del modelo completadas exitosamente")


def verificar_configuracion():
    """Verificar configuración de media files."""
    
    print("\n=== VERIFICANDO CONFIGURACIÓN ===\n")
    
    from django.conf import settings
    
    print(f"MEDIA_URL: {settings.MEDIA_URL}")
    print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
    
    # Verificar que la carpeta media existe
    if not os.path.exists(settings.MEDIA_ROOT):
        print(f"\n⚠ Carpeta media no existe. Creando...")
        os.makedirs(settings.MEDIA_ROOT)
        print(f"✓ Carpeta creada: {settings.MEDIA_ROOT}")
    else:
        print(f"✓ Carpeta media existe: {settings.MEDIA_ROOT}")
    
    # Verificar Pillow
    try:
        from PIL import Image
        print(f"✓ Pillow instalado correctamente")
    except ImportError:
        print(f"✗ Pillow no está instalado. Ejecuta: pip install Pillow")


def verificar_api():
    """Verificar que los endpoints de API están disponibles."""
    
    print("\n=== VERIFICANDO API ===\n")
    
    from django.urls import reverse
    from rest_framework.test import APIClient
    
    try:
        # Intentar resolver las URLs
        url_list = reverse('packing-imagen-list')
        print(f"✓ URL de listado de imágenes: {url_list}")
        
        print("\nEndpoints disponibles:")
        print(f"  GET    {url_list} - Listar imágenes")
        print(f"  POST   {url_list} - Subir imagen")
        print(f"  POST   {url_list}subir-multiple/ - Subir múltiples")
        print(f"  GET    {url_list}<id>/ - Detalle")
        print(f"  PUT    {url_list}<id>/ - Actualizar")
        print(f"  DELETE {url_list}<id>/ - Eliminar")
        
    except Exception as e:
        print(f"✗ Error al verificar URLs: {e}")


def main():
    """Ejecutar todas las pruebas."""
    
    print("╔═══════════════════════════════════════════════════╗")
    print("║   PRUEBA DE SISTEMA DE IMÁGENES - PACKING        ║")
    print("╚═══════════════════════════════════════════════════╝")
    
    try:
        verificar_configuracion()
        probar_modelo_imagenes()
        verificar_api()
        
        print("\n╔═══════════════════════════════════════════════════╗")
        print("║   ✓ TODAS LAS PRUEBAS COMPLETADAS                ║")
        print("╚═══════════════════════════════════════════════════╝")
        
        print("\n📝 Próximos pasos:")
        print("  1. Iniciar el servidor: python manage.py runserver")
        print("  2. Probar la API con cURL o Postman")
        print("  3. Integrar los componentes en el frontend")
        print("\n📚 Documentación:")
        print("  - Backend API: backend/IMAGENES_API.md")
        print("  - Frontend: frontend/IMAGENES_FRONTEND.md")
        print("  - Resumen: IMAGENES_README.md")
        
    except Exception as e:
        print(f"\n✗ Error durante las pruebas: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
