import json
import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_pretest_word_doc():
    json_path = 'english_pretest_100.json'
    if not os.path.exists(json_path):
        print(f"Error: {json_path} does not exist yet.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    questions = data['questions']
    parts = data['parts']

    doc = Document()

    # Page Margins (Normal: 1 inch / 2.54 cm)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Base Colors
    COLOR_INDIGO = RGBColor(79, 70, 229)    # #4F46E5
    COLOR_DARK = RGBColor(17, 24, 39)       # #111827
    COLOR_GRAY = RGBColor(75, 85, 99)       # #4B5563
    COLOR_EMERALD = RGBColor(16, 185, 129)  # #10B981

    # 1. Document Title Header
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    run_sub = title_p.add_run("NJ TUTOR ACADEMY · SMART LEARNING SYSTEM\n")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(10)
    run_sub.font.bold = True
    run_sub.font.color.rgb = COLOR_INDIGO

    run_title = title_p.add_run("แบบทดสอบวัดพื้นฐานภาษาอังกฤษ (English Pre-Test 100 ข้อ)")
    run_title.font.name = "Angsana New"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_DARK

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_p.paragraph_format.space_after = Pt(14)
    run_meta = sub_p.add_run("ข้อสอบปรนัย 4 ตัวเลือก (A, B, C, D) พร้อมเฉลยและคำอธิบายละเอียดครบ 100 ข้อ\n(เอกสารสำหรับตรวจสอบ ปรับแก้ และทบทวนเนื้อหาก่อนนำไปใช้งานจริง)")
    run_meta.font.name = "Angsana New"
    run_meta.font.size = Pt(14)
    run_meta.font.italic = True
    run_meta.font.color.rgb = COLOR_GRAY

    # Overview Table (โครงสร้างข้อสอบ)
    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table.rows[0].cells
    headers = ["พาร์ท (Part)", "ทักษะที่วัด", "จำนวนข้อ", "ช่วงข้อ"]
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        set_cell_background(hdr_cells[i], "4F46E5")
        for p in hdr_cells[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = "Angsana New"
                r.font.size = Pt(14)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)

    part_ranges = [
        ("Part 1: Vocabulary", "คำศัพท์และการใช้คำ (Collocations & Phrasal Verbs)", "25 ข้อ", "ข้อ 1 - 25"),
        ("Part 2: Grammar & Structure", "ไวยากรณ์และโครงสร้างประโยค (Tenses, If-Clause, Voice, Clauses)", "30 ข้อ", "ข้อ 26 - 55"),
        ("Part 3: Reading Comprehension", "การอ่านจับใจความ 5 บทความ (Main Idea, Details, Inference)", "20 ข้อ", "ข้อ 56 - 75"),
        ("Part 4: Conversation", "บทสนทนาและการสื่อสารในสถานการณ์ต่างๆ (Situational English)", "25 ข้อ", "ข้อ 76 - 100"),
    ]

    for row_idx, (p_title, p_desc, p_count, p_range) in enumerate(part_ranges):
        row_cells = table.add_row().cells
        bg_color = "F9FAFB" if row_idx % 2 == 0 else "FFFFFF"
        for i, val in enumerate([p_title, p_desc, p_count, p_range]):
            row_cells[i].text = val
            set_cell_background(row_cells[i], bg_color)
            for p in row_cells[i].paragraphs:
                if i in [0, 2, 3]:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.font.name = "Angsana New"
                    r.font.size = Pt(13)
                    r.font.color.rgb = COLOR_DARK
                    if i == 0 or i == 2:
                        r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Questions Generation
    current_part = None
    current_passage_id = None

    for q in questions:
        # Check if new part starts
        if q['part'] != current_part:
            current_part = q['part']
            part_meta = next((p for p in parts if p['id'] == current_part), None)
            
            doc.add_page_break()
            part_heading = doc.add_paragraph()
            part_heading.paragraph_format.space_before = Pt(12)
            part_heading.paragraph_format.space_after = Pt(4)
            r_ph = part_heading.add_run(f"PART {part_meta['partNumber']}: {part_meta['title'].upper()} ({part_meta['thaiTitle']})")
            r_ph.font.name = "Arial"
            r_ph.font.size = Pt(15)
            r_ph.font.bold = True
            r_ph.font.color.rgb = COLOR_INDIGO

            part_desc = doc.add_paragraph()
            part_desc.paragraph_format.space_after = Pt(14)
            r_pd = part_desc.add_run(f"คำอธิบายพาร์ท: {part_meta['description']} (จำนวน {part_meta['questionCount']} ข้อ)")
            r_pd.font.name = "Angsana New"
            r_pd.font.size = Pt(13)
            r_pd.font.italic = True
            r_pd.font.color.rgb = COLOR_GRAY

        # Check if Reading Passage starts
        if q.get('passageText') and q.get('passageId') != current_passage_id:
            current_passage_id = q.get('passageId')
            
            passage_box = doc.add_table(rows=1, cols=1)
            passage_box.alignment = WD_TABLE_ALIGNMENT.CENTER
            cell = passage_box.rows[0].cells[0]
            set_cell_background(cell, "EEF2FF")
            set_cell_margins(cell, top=140, bottom=140, left=180, right=180)

            p_title = cell.paragraphs[0]
            p_title.paragraph_format.space_after = Pt(4)
            r_pt = p_title.add_run(f"📖 {q.get('passageTitle')}")
            r_pt.font.name = "Arial"
            r_pt.font.size = Pt(11)
            r_pt.font.bold = True
            r_pt.font.color.rgb = COLOR_INDIGO

            p_text = cell.add_paragraph()
            p_text.paragraph_format.space_after = Pt(2)
            r_text = p_text.add_run(q.get('passageText'))
            r_text.font.name = "Calibri"
            r_text.font.size = Pt(10.5)
            r_text.font.color.rgb = COLOR_DARK

            doc.add_paragraph().paragraph_format.space_after = Pt(6)

        # Question Container / Block
        q_p = doc.add_paragraph()
        q_p.paragraph_format.space_before = Pt(6)
        q_p.paragraph_format.space_after = Pt(2)
        r_num = q_p.add_run(f"ข้อที่ {q['id']}. ")
        r_num.font.name = "Arial"
        r_num.font.size = Pt(11)
        r_num.font.bold = True
        r_num.font.color.rgb = COLOR_INDIGO

        r_code = q_p.add_run(f"[{q['code']}] ")
        r_code.font.name = "Calibri"
        r_code.font.size = Pt(9.5)
        r_code.font.color.rgb = COLOR_GRAY

        r_q = q_p.add_run(q['question'])
        r_q.font.name = "Calibri"
        r_q.font.size = Pt(11)
        r_q.font.bold = True
        r_q.font.color.rgb = COLOR_DARK

        # 4 Options Table or List
        # Let's put options in 2 columns for compact, clean layout
        opt_table = doc.add_table(rows=2, cols=2)
        opt_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        opts = [
            (0, 0, 'A', q['options']['A']),
            (0, 1, 'B', q['options']['B']),
            (1, 0, 'C', q['options']['C']),
            (1, 1, 'D', q['options']['D']),
        ]

        for r_i, c_i, key, val in opts:
            c = opt_table.rows[r_i].cells[c_i]
            p = c.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            
            is_correct = (key == q['correct'])
            if is_correct:
                set_cell_background(c, "ECFDF5")
            else:
                set_cell_background(c, "FAFAFA")
            set_cell_margins(c, top=60, bottom=60, left=100, right=100)

            r_box = p.add_run("[   ] " if not is_correct else "[ ✓ ] ")
            r_box.font.name = "Consolas"
            r_box.font.size = Pt(9.5)
            r_box.font.bold = is_correct
            r_box.font.color.rgb = COLOR_EMERALD if is_correct else COLOR_GRAY

            r_key = p.add_run(f"({key})  ")
            r_key.font.name = "Calibri"
            r_key.font.size = Pt(10.5)
            r_key.font.bold = True
            r_key.font.color.rgb = COLOR_EMERALD if is_correct else COLOR_DARK

            r_val = p.add_run(val)
            r_val.font.name = "Calibri"
            r_val.font.size = Pt(10.5)
            r_val.font.bold = is_correct
            r_val.font.color.rgb = COLOR_DARK

        # Answer & Explanation Block
        ans_p = doc.add_paragraph()
        ans_p.paragraph_format.space_before = Pt(2)
        ans_p.paragraph_format.space_after = Pt(2)
        
        r_ans_label = ans_p.add_run("   เฉลย: ")
        r_ans_label.font.name = "Angsana New"
        r_ans_label.font.size = Pt(13)
        r_ans_label.font.bold = True
        r_ans_label.font.color.rgb = COLOR_EMERALD

        r_ans_val = ans_p.add_run(f"ข้อ {q['correct']} ({q['options'][q['correct']]})   ")
        r_ans_val.font.name = "Angsana New"
        r_ans_val.font.size = Pt(13)
        r_ans_val.font.bold = True
        r_ans_val.font.color.rgb = COLOR_DARK

        r_exp_label = ans_p.add_run("คำอธิบาย: ")
        r_exp_label.font.name = "Angsana New"
        r_exp_label.font.size = Pt(13)
        r_exp_label.font.bold = True
        r_exp_label.font.color.rgb = COLOR_GRAY

        r_exp = ans_p.add_run(q['explanation'])
        r_exp.font.name = "Angsana New"
        r_exp.font.size = Pt(13)
        r_exp.font.color.rgb = COLOR_DARK

        # Optional edit space note
        note_p = doc.add_paragraph()
        note_p.paragraph_format.space_before = Pt(0)
        note_p.paragraph_format.space_after = Pt(6)
        r_note = note_p.add_run("   บันทึกแก้ไขเพิ่มเติม: __________________________________________________________________")
        r_note.font.name = "Angsana New"
        r_note.font.size = Pt(11)
        r_note.font.color.rgb = RGBColor(209, 213, 219)

    # Sump up: Full 1-100 Answer Key Grid Table at the end
    doc.add_page_break()
    ak_h = doc.add_paragraph()
    ak_h.paragraph_format.space_before = Pt(10)
    ak_h.paragraph_format.space_after = Pt(6)
    r_akh = ak_h.add_run("ตารางสรุปเฉลยคำตอบ 100 ข้อ (Answer Key Summary)")
    r_akh.font.name = "Angsana New"
    r_akh.font.size = Pt(18)
    r_akh.font.bold = True
    r_akh.font.color.rgb = COLOR_INDIGO

    ak_sub = doc.add_paragraph()
    ak_sub.paragraph_format.space_after = Pt(10)
    r_aksub = ak_sub.add_run("ตารางสำหรับตรวจคำตอบอย่างรวดเร็ว (10 แถว × 10 คอลัมน์)")
    r_aksub.font.name = "Angsana New"
    r_aksub.font.size = Pt(13)
    r_aksub.font.color.rgb = COLOR_GRAY

    # Table: 10 rows of 10 items (or 5 columns of 'ข้อ - คำตอบ')
    grid_table = doc.add_table(rows=21, cols=5)
    grid_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    ghdr = grid_table.rows[0].cells
    for i in range(5):
        ghdr[i].text = f"ข้อที่ {i*20 + 1} - {i*20 + 20}"
        set_cell_background(ghdr[i], "4F46E5")
        for p in ghdr[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = "Angsana New"
                r.font.size = Pt(13)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)

    for row_idx in range(1, 21):
        row_cells = grid_table.rows[row_idx].cells
        bg = "F9FAFB" if row_idx % 2 == 0 else "FFFFFF"
        for col_idx in range(5):
            q_num = col_idx * 20 + row_idx
            q_obj = next((item for item in questions if item['id'] == q_num), None)
            ans = q_obj['correct'] if q_obj else '-'
            row_cells[col_idx].text = f"ข้อ {q_num}: {ans}"
            set_cell_background(row_cells[col_idx], bg)
            for p in row_cells[col_idx].paragraphs:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for r in p.runs:
                    r.font.name = "Angsana New"
                    r.font.size = Pt(12)
                    r.font.color.rgb = COLOR_DARK
                    if f": {ans}" in r.text:
                        r.font.bold = True

    output_filename = "English_PreTest_100_Questions.docx"
    doc.save(output_filename)
    print(f"Document successfully created and saved as: {output_filename}")

if __name__ == '__main__':
    create_pretest_word_doc()
