"""
referral_pdf.py — auto-generates a referral letter PDF for a high-risk patient.
"""
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "referrals")
os.makedirs(OUTPUT_DIR, exist_ok=True)

RISK_COLOR = {
    "critical": colors.HexColor("#C23B22"),
    "high": colors.HexColor("#E8871E"),
    "medium": colors.HexColor("#D9A300"),
    "low": colors.HexColor("#3C8A5B"),
}


def generate_referral_pdf(patient: dict, visit: dict, assessment: dict, facility_name: str) -> str:
    """
    patient, visit: plain dicts of relevant fields
    assessment: dict with risk_level, flags (list of {category, severity, message})
    Returns the filename (not full path) of the generated PDF.
    """
    filename = f"referral_patient{patient['id']}_visit{visit['id']}.pdf"
    full_path = os.path.join(OUTPUT_DIR, filename)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle", parent=styles["Title"], textColor=colors.HexColor("#0B4F4A"), fontSize=18
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"], textColor=colors.HexColor("#555555"), fontSize=9
    )
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=11, leading=15)
    flag_style = ParagraphStyle("Flag", parent=styles["Normal"], fontSize=10, leading=14, leftIndent=10)

    doc = SimpleDocTemplate(
        full_path, pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm, leftMargin=2 * cm, rightMargin=2 * cm,
    )

    story = []
    story.append(Paragraph("ASHA Worker AI Co-pilot", label_style))
    story.append(Paragraph("Medical Referral Letter", title_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0B4F4A")))
    story.append(Spacer(1, 14))

    risk_level = assessment["risk_level"]
    risk_color = RISK_COLOR.get(risk_level, colors.black)

    info_table_data = [
        ["Date", datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")],
        ["Referring to", facility_name],
        ["ASHA Worker", patient.get("asha_worker_name") or "—"],
        ["Risk Level", risk_level.upper()],
    ]
    info_table = Table(info_table_data, colWidths=[4 * cm, 12 * cm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#555555")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TEXTCOLOR", (1, 3), (1, 3), risk_color),
        ("FONTNAME", (1, 3), (1, 3), "Helvetica-Bold"),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Patient Details", styles["Heading2"]))
    patient_table_data = [
        ["Name", patient.get("name", "")],
        ["Age / Gender", f"{patient.get('age', '')} / {patient.get('gender', '')}"],
        ["Village", patient.get("village", "")],
        ["Phone", patient.get("phone") or "—"],
    ]
    patient_table = Table(patient_table_data, colWidths=[4 * cm, 12 * cm])
    patient_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#555555")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Vitals Recorded", styles["Heading2"]))
    vitals_rows = [["Measurement", "Value"]]
    vitals_map = [
        ("Blood pressure", f"{visit.get('systolic_bp', '—')}/{visit.get('diastolic_bp', '—')} mmHg"),
        ("Blood sugar", f"{visit.get('blood_sugar_mg_dl', '—')} mg/dL"),
        ("Hemoglobin", f"{visit.get('hemoglobin_g_dl', '—')} g/dL"),
        ("Temperature", f"{visit.get('temperature_c', '—')} °C"),
        ("Pulse", f"{visit.get('pulse_bpm', '—')} bpm"),
        ("BMI", f"{visit.get('bmi', '—')}"),
    ]
    for label, val in vitals_map:
        vitals_rows.append([label, val])
    vitals_table = Table(vitals_rows, colWidths=[6 * cm, 10 * cm])
    vitals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B4F4A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F4ED")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(vitals_table)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Clinical Flags Identified by AI Co-pilot", styles["Heading2"]))
    flags = assessment.get("flags", [])
    if flags:
        for f in flags:
            sev_color = RISK_COLOR.get(f["severity"], colors.black)
            bullet = f'<font color="{sev_color.hexval()}">●</font> <b>[{f["severity"].upper()}]</b> {f["message"]}'
            story.append(Paragraph(bullet, flag_style))
            story.append(Spacer(1, 4))
    else:
        story.append(Paragraph("No specific rule-based flags — referral based on overall risk score.", body_style))

    story.append(Spacer(1, 20))
    story.append(Paragraph("Reason for Referral", styles["Heading2"]))
    story.append(Paragraph(assessment.get("reason_summary", "Patient requires further clinical evaluation."), body_style))

    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC")))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "This referral was generated with the support of an AI decision-support tool and must be reviewed "
        "by a qualified healthcare provider. It is not a diagnosis.",
        label_style
    ))

    doc.build(story)
    return filename
