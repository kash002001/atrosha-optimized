"""
generates meridian_invoice.pdf — looks like a real scanned vendor invoice.
requires: pip install reportlab
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, Paragraph, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
import os

OUT = os.path.join(os.path.dirname(__file__), "meridian_invoice.pdf")

def build():
    doc = SimpleDocTemplate(OUT, pagesize=letter,
                            rightMargin=0.75*inch, leftMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    styles = getSampleStyleSheet()

    DARK    = colors.HexColor("#1a1f2e")
    ACCENT  = colors.HexColor("#2563eb")
    LIGHT   = colors.HexColor("#f8fafc")
    MUTED   = colors.HexColor("#64748b")

    head_style   = ParagraphStyle("head",   fontName="Helvetica-Bold",   fontSize=22, textColor=DARK,   spaceAfter=2)
    tag_style    = ParagraphStyle("tag",    fontName="Helvetica",         fontSize=10, textColor=MUTED)
    label_style  = ParagraphStyle("label",  fontName="Helvetica-Bold",   fontSize=9,  textColor=MUTED,  spaceBefore=6)
    value_style  = ParagraphStyle("value",  fontName="Helvetica",         fontSize=10, textColor=DARK)
    inv_style    = ParagraphStyle("inv",    fontName="Helvetica-Bold",   fontSize=28, textColor=ACCENT, alignment=TA_RIGHT)
    total_style  = ParagraphStyle("total",  fontName="Helvetica-Bold",   fontSize=16, textColor=DARK,   alignment=TA_RIGHT)
    note_style   = ParagraphStyle("note",   fontName="Helvetica-Oblique", fontSize=8,  textColor=MUTED,  alignment=TA_CENTER)

    story = []

    # header row: company name left, INVOICE right
    header_data = [[
        [Paragraph("Meridian Logistics LLC", head_style),
         Paragraph("14 Commerce Blvd, Suite 300 · Chicago, IL 60601", tag_style),
         Paragraph("EIN: 83-4471209  ·  meridianlogistics.io", tag_style)],
        Paragraph("INVOICE", inv_style)
    ]]
    header_table = Table(header_data, colWidths=[4*inch, 3*inch])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ALIGN",  (1,0), (1,0),  "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.2*inch))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT))
    story.append(Spacer(1, 0.2*inch))

    # meta row: bill-to left, invoice details right
    meta_data = [[
        [Paragraph("BILL TO", label_style),
         Paragraph("Atrosha Technologies Inc.", value_style),
         Paragraph("350 Fifth Avenue, 41st Floor", value_style),
         Paragraph("New York, NY 10118", value_style),
         Paragraph("accounts@atrosha.bond", value_style)],
        [Paragraph("INVOICE NO.", label_style),   Paragraph("INV-2026-0891", value_style),
         Paragraph("ISSUE DATE", label_style),     Paragraph("March 17, 2026", value_style),
         Paragraph("DUE DATE", label_style),       Paragraph("April 10, 2026", value_style),
         Paragraph("TERMS", label_style),          Paragraph("Net 30", value_style)],
    ]]
    meta_table = Table(meta_data, colWidths=[4*inch, 3*inch])
    meta_table.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(meta_table)
    story.append(Spacer(1, 0.3*inch))

    # line items table
    table_data = [
        ["DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"],
        ["Dedicated Freight Lane — Chicago to Newark (Q1 2026)", "1", "$18,000.00", "$18,000.00"],
        ["Fuel Surcharge (6.5%)", "1", "$1,170.00",  "$1,170.00"],
        ["Expedited Handling & Last-Mile Delivery", "2", "$1,665.00", "$3,330.00"],
        ["Customs Documentation & Compliance Fee", "1", "$1,200.00", "$1,200.00"],
        ["Cargo Insurance Premium (Q1)", "1", "$800.00",  "$800.00"],
    ]
    item_table = Table(table_data, colWidths=[3.5*inch, 0.6*inch, 1.3*inch, 1.3*inch])
    item_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),  (-1,0),  ACCENT),
        ("TEXTCOLOR",     (0,0),  (-1,0),  colors.white),
        ("FONTNAME",      (0,0),  (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),  (-1,-1), 9),
        ("ALIGN",         (1,0),  (-1,-1), "RIGHT"),
        ("ALIGN",         (0,0),  (0,-1),  "LEFT"),
        ("ROWBACKGROUNDS",(0,1),  (-1,-1), [LIGHT, colors.white]),
        ("GRID",          (0,0),  (-1,-1), 0.25, colors.HexColor("#e2e8f0")),
        ("TOPPADDING",    (0,0),  (-1,-1), 6),
        ("BOTTOMPADDING", (0,0),  (-1,-1), 6),
        ("LEFTPADDING",   (0,0),  (-1,-1), 8),
        ("RIGHTPADDING",  (0,0),  (-1,-1), 8),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 0.15*inch))

    # totals block (right-aligned)
    totals_data = [
        ["Subtotal:", "$24,500.00"],
        ["Tax (0% — B2B exempt):", "$0.00"],
        ["", ""],
        ["TOTAL DUE:", "$24,500.00"],
    ]
    totals_table = Table(totals_data, colWidths=[5.5*inch, 1.2*inch])
    totals_table.setStyle(TableStyle([
        ("ALIGN",         (0,0), (-1,-1), "RIGHT"),
        ("FONTNAME",      (0,0), (-1, 2), "Helvetica"),
        ("FONTNAME",      (0,3), (-1, 3), "Helvetica-Bold"),
        ("FONTSIZE",      (0,3), (-1, 3), 13),
        ("TEXTCOLOR",     (0,3), (-1, 3), ACCENT),
        ("LINEABOVE",     (0,3), (-1, 3), 1.5, ACCENT),
        ("FONTSIZE",      (0,0), (-1, -1), 10),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.3*inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.15*inch))

    # payment instructions
    pay_data = [[
        [Paragraph("PAYMENT INSTRUCTIONS", label_style),
         Paragraph("Wire Transfer  ·  Bank: JPMorgan Chase  ·  Routing: 021000021", value_style),
         Paragraph("Account: 4471-2093-8812  ·  Account Name: Meridian Logistics LLC", value_style)],
        [Paragraph("REMITTANCE EMAIL", label_style),
         Paragraph("ar@meridianlogistics.io", value_style)],
    ]]
    pay_table = Table(pay_data, colWidths=[4.5*inch, 2.5*inch])
    pay_table.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(pay_table)
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(
        "Please reference invoice number INV-2026-0891 in your payment. Late payments are subject to a 1.5% monthly finance charge. "
        "Thank you for your business.",
        note_style
    ))

    doc.build(story)
    print(f"✓  Invoice saved to: {OUT}")

if __name__ == "__main__":
    build()
