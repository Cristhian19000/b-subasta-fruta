import logging
import re
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)

def _get_html_layout(content, title="AgroSubasta"):
    """
    Layout base HTML profesional, moderno y con colores vibrantes tipo Agro.
    """
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
            .email-container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }}
            .header {{ background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 40px 20px; text-align: center; color: #ffffff; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }}
            .header p {{ margin: 5px 0 0; opacity: 0.9; font-size: 14px; font-weight: 400; }}
            .body {{ padding: 40px; }}
            .title-section {{ margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }}
            .title-section h2 {{ color: #064e3b; font-size: 24px; font-weight: 700; margin: 0; }}
            .content-text {{ color: #475569; font-size: 16px; line-height: 1.6; }}
            .data-card {{ background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; margin: 24px 0; }}
            .data-table {{ width: 100%; border-collapse: collapse; }}
            .data-table th {{ text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; width: 40%; }}
            .data-table td {{ padding: 12px 0; color: #1e293b; font-size: 15px; font-weight: 600; border-bottom: 1px solid #f1f5f9; }}
            .data-table tr:last-child td {{ border-bottom: none; }}
            .highlight {{ color: #10b981; font-size: 18px; font-weight: 800; }}
            .message-accent {{ border-left: 4px solid #10b981; background-color: #ecfdf5; padding: 20px; border-radius: 0 8px 8px 0; font-style: italic; color: #065f46; margin: 20px 0; }}
            .footer {{ background-color: #f8fafc; padding: 30px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }}
            .footer strong {{ color: #64748b; }}
            @media (max-width: 600px) {{
                .email-container {{ margin: 0; border-radius: 0; }}
                .body {{ padding: 24px; }}
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>SubasApp</h1>
                <p>Tu plataforma de subastas</p>
            </div>
            <div class="body">
                <div class="title-section">
                    <h2>{title}</h2>
                </div>
                <div class="content-text">
                    {content}
                </div>
            </div>
            <div class="footer">
                <strong>© 2026 SubasApp </strong><br>
                Todos los derechos reservados.
            </div>
        </div>
    </body>
    </html>
    """

def enviar_email_ganador(subasta, oferta_ganadora):
    cliente = oferta_ganadora.cliente
    admin_email = getattr(settings, 'ADMIN_EMAIL', 'graceguti173@gmail.com')
    destinatario = cliente.correo_electronico_1
    
    if not destinatario:
        logger.warning(f"No se pudo enviar email: Cliente {cliente.ruc_dni} no tiene correo_electronico_1.")
        return

    subject = f'¡Felicidades! Ganaste la Subasta #{subasta.id}'
    
    # Calcular total y fecha
    total_pagar = float(subasta.kilos_totales) * float(oferta_ganadora.monto)
    fecha_subasta = subasta.fecha_hora_inicio.strftime('%d/%m/%Y')

    content = f"""
        <p>Hola <strong>{cliente.nombre_razon_social}</strong>,</p>
        <p>Oficialmente has resultado ganador en la subasta realizada.</p>
        
        <div class="data-card">
            <table class="data-table">
                <tr><th>Subasta</th><td>#{subasta.id}</td></tr>
                <tr><th>Día de Subasta</th><td>{fecha_subasta}</td></tr>
                <tr><th>Tipo de Fruta</th><td>{subasta.tipo_fruta.nombre}</td></tr>
                <tr><th>Empresa</th><td>{subasta.empresa.nombre}</td></tr>
                <tr><th>Cantidad</th><td>{subasta.kilos_totales} kg</td></tr>
                <tr><th>Precio por Kilo</th><td>S/ {oferta_ganadora.monto}</td></tr>
                <tr><th>Total a Pagar</th><td class="highlight">S/ {total_pagar:,.2f}</td></tr>
            </table>
        </div>
        
        <p> En breves un asesor se contactará para más detalles .</p>
    """
    
    html_msg = _get_html_layout(content, "Notificación de Adjudicación")

    try:
        msg = EmailMultiAlternatives(subject, f"Ganaste la subasta #{subasta.id}", settings.DEFAULT_FROM_EMAIL, [destinatario])
        msg.attach_alternative(html_msg, "text/html")
        msg.send()
        
        # Copia administrativa
        msg_admin = EmailMultiAlternatives(f'CIERRE: Subasta #{subasta.id} - {cliente.ruc_dni}', "Resumen de ganador", settings.DEFAULT_FROM_EMAIL, [admin_email])
        admin_content = f"""
            <p>Se ha cerrado oficialmente la subasta #{subasta.id}. Aquí el resumen comercial:</p>
            <div class='data-card'>
                <table class='data-table'>
                    <tr><th>Empresa / Cliente</th><td>{cliente.nombre_razon_social}</td></tr>
                    <tr><th>RUC / DNI</th><td>{cliente.ruc_dni}</td></tr>
                    <tr><th>Fecha de Cierre</th><td>{fecha_subasta}</td></tr>
                    <tr><th>Producto</th><td>{subasta.tipo_fruta.nombre}</td></tr>
                    <tr><th>Cantidad</th><td>{subasta.kilos_totales} kg</td></tr>
                    <tr><th>Precio por Kilo</th><td>S/ {oferta_ganadora.monto}</td></tr>
                    <tr><th>Monto Total a Cobrar</th><td class='highlight'>S/ {total_pagar:,.2f}</td></tr>
                </table>
            </div>
            <p><strong>Datos de contacto del cliente:</strong> 
            {cliente.contacto_1} - {cliente.numero_1} / {cliente.correo_electronico_1}</p>
        """
        msg_admin.attach_alternative(_get_html_layout(admin_content, "Reporte de Cierre de Subasta"), "text/html")
        msg_admin.send()
        
    except Exception as e:
        logger.error(f"Error en enviar_email_ganador: {e}")

def enviar_email_soporte(datos, archivos=None):
    admin_email = getattr(settings, 'ADMIN_EMAIL', 'graceguti173@gmail.com')
    subject = f"Consulta de Soporte: {datos.get('ruc_dni', 'Desconocido')}"
    
    mensaje_raw = datos.get('mensaje', 'Sin mensaje')
    # Intentar organizar ASUNTO y DETALLE si vienen juntos
    asunto_match = re.search(r'ASUNTO:\s*(.*?)(DETALLE:|$)', mensaje_raw, re.IGNORECASE | re.DOTALL)
    detalle_match = re.search(r'DETALLE:\s*(.*)', mensaje_raw, re.IGNORECASE | re.DOTALL)
    
    asunto_text = asunto_match.group(1).strip() if asunto_match else None
    detalle_text = detalle_match.group(1).strip() if detalle_match else mensaje_raw

    content = f"""
        <p>Se ha recibido una nueva solicitud de asistencia técnica con los siguientes detalles:</p>
        
        <div class="data-card">
            <table class="data-table">
                <tr><th>DNI/RUC</th><td>{datos.get('ruc_dni', 'N/A')}</td></tr>
                <tr><th>Nombre/Razón Social</th><td>{datos.get('nombre', 'N/A')}</td></tr>
                <tr><th>E-mail</th><td>{datos.get('email', 'N/A')}</td></tr>
            </table>
        </div>
        
        <div class="message-accent">
            {f'<p style="margin:0 0 10px 0; font-weight:800; color:#064e3b; text-transform:uppercase; font-size:13px;">ASUNTO: {asunto_text}</p>' if asunto_text else ''}
            <p style="margin:0;">{detalle_text}</p>
        </div>
        
        {f'<p style="margin-top:15px; color:#10b981; font-size:14px; font-weight:600;">📎 Hay {len(archivos)} archivos adjuntos en este correo.</p>' if archivos else ''}
    """
    
    html_msg = _get_html_layout(content, "Soporte Prize")
    
    try:
        msg = EmailMultiAlternatives(subject, "Nueva solicitud de soporte", settings.DEFAULT_FROM_EMAIL, [admin_email])
        msg.attach_alternative(html_msg, "text/html")
        
        if archivos:
            for f in archivos:
                try:
                    f.seek(0)
                    msg.attach(f.name, f.read(), f.content_type)
                except:
                    pass
        
        msg.send()
        return True
    except Exception as e:
        logger.error(f"Error en enviar_email_soporte: {e}")
        return False

def enviar_email_recuperacion(ruc_dni):
    admin_email = getattr(settings, 'ADMIN_EMAIL', 'graceguti173@gmail.com')
    subject = f"URGENTE: Recuperación de Acceso - {ruc_dni}"
    
    content = f"""
        <p>Un usuario ha solicitado recuperar el acceso a su cuenta en SubasApp.</p>
        
        <div class="data-card">
            <table class="data-table">
                <tr><th>Identificación (RUC/DNI)</th><td>{ruc_dni}</td></tr>
                <tr><th>Tipo de Solicitud</th><td>Recuperación de Acceso</td></tr>
                <tr><th>Plataforma</th><td>App Móvil / Web</td></tr>
            </table>
        </div>
        
        <p><strong>Acción requerida:</strong> Por favor, valide la identidad del usuario y proceda con el cambio de contraseña de forma manual desde el panel administrativo.</p>
    """
    
    try:
        msg = EmailMultiAlternatives(subject, f"Recuperación {ruc_dni}", settings.DEFAULT_FROM_EMAIL, [admin_email])
        msg.attach_alternative(_get_html_layout(content, "Solicitud de Acceso"), "text/html")
        msg.send()
        return True
    except Exception as e:
        logger.error(f"Error en enviar_email_recuperacion: {e}")
        return False
