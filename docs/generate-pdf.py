#!/usr/bin/env python3
"""Generate SRlite capabilities PDF from HTML using reportlab fallback or weasyprint."""

import os
import sys
from pathlib import Path

DOCS = Path(__file__).resolve().parent
HTML = DOCS / "SRlite-Capabilities-Breakdown.html"
PDF = DOCS / "SRlite-Capabilities-Breakdown.pdf"


def try_weasyprint():
    from weasyprint import HTML as WHTML
    WHTML(filename=str(HTML)).write_pdf(str(PDF))
    return True


def try_pdfkit():
    import pdfkit
    pdfkit.from_file(str(HTML), str(PDF))
    return True


def reportlab_fallback():
    """Build PDF directly with reportlab (no HTML renderer required)."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        PageBreak,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    doc = SimpleDocTemplate(
        str(PDF),
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title="SRlite Capabilities Breakdown",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=20,
        textColor=colors.HexColor("#0f3460"),
        spaceAfter=6,
    )
    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#16213e"),
        spaceBefore=14,
        spaceAfter=6,
    )
    h3 = ParagraphStyle(
        "H3",
        parent=styles["Heading3"],
        fontSize=11,
        textColor=colors.HexColor("#1e3a5f"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=14)
    small = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8.5, textColor=colors.grey)

    story = []

    def p(text, style=body):
        story.append(Paragraph(text, style))

    def bullets(items):
        for item in items:
            p(f"• {item}")

    p("SRlite / Roadside Radar", title_style)
    p('<font color="#4a5568"><i>Capabilities Breakdown — What This App Will Accomplish When Complete</i></font>', body)
    p("Prepared for js91tech · Marietta, GA · github.com/js91tech/SRlite · June 2026", small)
    story.append(Spacer(1, 10))

    p(
        '<b>Executive summary:</b> SRlite is a real-time dispatch <i>lead-fishing</i> command center for a '
        "roadside/tow company that owns its own trucks. It aggregates opportunities from multiple sources, "
        "scores them by likelihood of conversion, shows them on a live map alongside your fleet, and lets "
        "dispatchers assign the nearest truck in one click.",
        body,
    )
    story.append(Spacer(1, 8))

    p("1. Business Problem It Solves", h2)
    p(
        "Roadside assistance companies compete on speed and visibility. Leads arrive from marketplace apps "
        "(Honk, Urgently), traffic incidents, social media, police rotation, calls, and branded help links — "
        "often with no single view of your territory. SRlite centralizes those signals so dispatchers can answer: "
        "<i>Where is the next good call, how hot is it, and which truck can get there fastest?</i>",
        body,
    )

    p("2. Core Capabilities (Complete Vision)", h2)

    p("2.1 Territory Intelligence", h3)
    bullets([
        "Define service territory by ZIP code and radius (default: 30060, 25 miles)",
        "Automatic geocoding; visual territory circle on interactive map",
        "Hot corridor boosting for I-75, I-285, I-575",
        "Per-source weighting and configurable alert thresholds",
    ])

    p("2.2 Multi-Source Lead Aggregation", h3)
    source_data = [
        ["Priority", "Source", "Delivers", "Status"],
        ["P0", "Self-report /help", "GPS + phone contactable leads", "Built"],
        ["P0", "Inbound calls", "Call intake as scored leads", "Planned"],
        ["P0", "Fleet GPS", "Live truck positions; proximity scoring", "Demo"],
        ["P1", "Honk / Urgently", "Live marketplace payout offers", "Planned"],
        ["P1", "Motor club email", "Parsed club dispatch emails", "Planned"],
        ["P2", "Police rotation", "Cobb County / GSP workflow", "Planned"],
        ["P3", "511GA API", "Auto-ingest traffic incidents", "Built"],
        ["P3", "Social (Reddit/X)", "Keyword alerts for stranded motorists", "Planned"],
        ["P3", "Partner referrals", "Shop/dealer/insurer referral portal", "Planned"],
    ]
    t = Table(source_data, colWidths=[0.55 * inch, 1.2 * inch, 2.5 * inch, 0.75 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf2f7")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 8))

    p("2.3 Intelligent Lead Scoring", h3)
    bullets([
        "<b>Source weight</b> — marketplace and self-reports rank above passive feeds",
        "<b>Freshness bonus</b> — newer leads score higher; stale leads decay",
        "<b>Contactable bonus</b> — phone/SMS contact adds +15 points",
        "<b>Corridor bonus</b> — hot interstate incidents get extra points",
        "<b>Truck proximity</b> — nearest available unit within 15–25 min ETA boosts score",
    ])

    p("2.4 Dispatcher Command Center", h3)
    bullets([
        "Live Leaflet map: territory circle, scored lead pins, fleet markers",
        "Alert tray sorted by score with Fish (opportunities) and Jobs (active work) modes",
        "Contactable-only filter; lead detail panel with quotes and score breakdown",
        "One-click assign nearest truck; quick-stage and dismiss actions",
        "Audio alerts on high-priority incoming leads via WebSocket",
    ])

    story.append(PageBreak())

    p("2.5 Fleet & Field Operations", h3)
    bullets([
        "Track trucks: type, capabilities, status, position, driver name",
        "Job records on assignment with quote amount and customer phone",
        "Public /help page for stranded motorists (branded intake)",
        "Future: driver mobile app for accept/navigate/status updates",
    ])

    p("3. Technical Architecture", h2)
    bullets([
        "Frontend: React + Vite + TypeScript + Leaflet + WebSocket client",
        "Backend: Node.js + Express + SQLite + 511GA poller + WebSocket server",
        "Production: single Node process serves API, dashboard, and /help",
        "Hosting: Railway with persistent volume at /app/server/data (~$5/mo)",
        "URLs: / (dashboard), /help (intake), /api/health, /ws (real-time)",
    ])

    p("4. MVP vs. Complete Product", h2)
    mvp_data = [
        ["Feature", "MVP (Today)", "Complete"],
        ["Territory map + settings", "Yes", "Multi-territory"],
        ["Lead scoring + alert tray", "Yes", "ML classification, saved views"],
        ["Truck assign + jobs", "Yes", "Driver app confirmation"],
        ["Self-report /help", "Yes", "White-label branding"],
        ["511GA incidents", "Yes (API key)", "Additional DOT feeds"],
        ["Honk / Urgently", "Demo only", "Live API integration"],
        ["Social listening", "Demo lead", "Live Reddit/X monitor"],
        ["Partner portal / driver app", "—", "Full field ops suite"],
        ["Database", "SQLite", "PostgreSQL + PostGIS"],
    ]
    t2 = Table(mvp_data, colWidths=[1.8 * inch, 1.5 * inch, 2.4 * inch])
    t2.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf2f7")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        )
    )
    story.append(t2)
    story.append(Spacer(1, 10))

    p("5. Day-in-the-Life Workflow", h2)
    workflow = [
        "Dispatcher opens dashboard; territory and fleet visible on map.",
        "511GA poller drops I-75 accident lead into Alert Tray with score and map pin.",
        "Honk marketplace offer scores 92; dispatcher reviews payout and ETA.",
        "Motorist submits /help form; contactable lead scores 95+; dispatcher assigns Truck 2.",
        "Social listener flags Reddit post; dispatcher stages nearest truck.",
        "Assigned leads move to Jobs mode; expired leads auto-clear.",
    ]
    for i, step in enumerate(workflow, 1):
        p(f"{i}. {step}")

    p("6. Success Metrics", h2)
    bullets([
        "Time to first contact (lead creation → dispatcher action)",
        "Lead conversion rate (% fished leads → paid jobs)",
        "Revenue per truck-hour (marketplace + direct)",
        "Territory capture rate (% incidents seen vs. missed)",
        "Source ROI by channel (Honk, 511, social, self-report)",
    ])

    p("7. Roadmap", h2)
    roadmap = [
        ["Phase 1 — MVP (current)", "Dashboard, scoring, demo data, self-report, 511, WebSocket, Railway"],
        ["Phase 2 — Revenue", "Honk/Urgently APIs, motor club email, inbound calls"],
        ["Phase 3 — Field ops", "Driver app, live GPS telematics, job status"],
        ["Phase 4 — Growth", "Social listening, partner portal, multi-territory"],
        ["Phase 5 — Scale", "PostgreSQL/PostGIS, RBAC, billing, analytics"],
    ]
    t3 = Table([["Phase", "Deliverables"]] + roadmap, colWidths=[1.6 * inch, 4.1 * inch])
    t3.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf2f7")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        )
    )
    story.append(t3)

    doc.build(story)
    return True


def main():
    for fn, name in [
        (try_weasyprint, "weasyprint"),
        (try_pdfkit, "pdfkit"),
    ]:
        try:
            fn()
            print(f"PDF generated via {name}: {PDF}")
            return 0
        except Exception as e:
            print(f"{name} unavailable: {e}", file=sys.stderr)

    try:
        reportlab_fallback()
        print(f"PDF generated via reportlab: {PDF}")
        return 0
    except Exception as e:
        print(f"reportlab failed: {e}", file=sys.stderr)
        print(f"Open HTML in browser and Print to PDF: {HTML}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
