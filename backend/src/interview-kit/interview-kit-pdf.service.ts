import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { InterviewKit } from '../entities/interview-kit.entity';
import { CandidateProfile } from '../entities/candidate-profile.entity';

// pdfmake is a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfmake = require('pdfmake');

const FONTS = {
  Roboto: {
    normal: path.join(__dirname, '../../node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf'),
    bold: path.join(__dirname, '../../node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf'),
    italics: path.join(__dirname, '../../node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, '../../node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf'),
  },
};

// Initialise fonts once at module load
pdfmake.addFonts(FONTS);
pdfmake.setUrlAccessPolicy(() => false);

@Injectable()
export class InterviewKitPdfService {
  async generatePdf(kit: InterviewKit, profile: CandidateProfile): Promise<Buffer> {
    const docDefinition = this.buildDocDefinition(kit, profile);
    const pdfDoc = pdfmake.createPdf(docDefinition);
    return pdfDoc.getBuffer();
  }

  private buildDocDefinition(kit: InterviewKit, profile: CandidateProfile) {
    const content: object[] = [];

    // ── Title ──────────────────────────────────────────────────────────────
    content.push({
      text: 'Interview Kit',
      style: 'title',
      margin: [0, 0, 0, 4],
    });

    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#CCCCCC' }],
      margin: [0, 0, 0, 12],
    });

    // ── Candidate Summary ──────────────────────────────────────────────────
    content.push({ text: 'Candidate Summary', style: 'sectionHeader' });

    content.push({
      table: {
        widths: [120, '*'],
        body: [
          [{ text: 'Name', style: 'label' }, { text: profile.name, style: 'value' }],
          [
            { text: 'Email', style: 'label' },
            { text: profile.contact?.email ?? '—', style: 'value' },
          ],
          [
            { text: 'Skills', style: 'label' },
            {
              text: profile.skills.length
                ? profile.skills.map((s) => s.canonical_name).join(', ')
                : '—',
              style: 'value',
            },
          ],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 4, 0, 8],
    });

    if (profile.summary) {
      content.push({ text: profile.summary, style: 'summary', margin: [0, 0, 0, 16] });
    }

    // ── Questions ──────────────────────────────────────────────────────────
    content.push({ text: 'Interview Questions', style: 'sectionHeader' });

    kit.questions.forEach((q, idx) => {
      const typeLabel = q.type.charAt(0).toUpperCase() + q.type.slice(1);
      const typeBadgeColor =
        q.type === 'behavioral' ? '#2563EB' : q.type === 'technical' ? '#16A34A' : '#D97706';

      content.push({
        margin: [0, 8, 0, 0],
        stack: [
          // Question header row
          {
            columns: [
              {
                text: `Q${idx + 1}. ${q.text}`,
                style: 'questionText',
                width: '*',
              },
              {
                text: typeLabel,
                style: 'typeBadge',
                color: typeBadgeColor,
                width: 'auto',
                alignment: 'right',
              },
            ],
          },
          // Rubric table
          {
            margin: [0, 6, 0, 0],
            table: {
              widths: [60, '*'],
              body: [
                [
                  { text: 'Strong', style: 'rubricLabel', color: '#16A34A' },
                  { text: q.rubric.strong, style: 'rubricText' },
                ],
                [
                  { text: 'Adequate', style: 'rubricLabel', color: '#D97706' },
                  { text: q.rubric.adequate, style: 'rubricText' },
                ],
                [
                  { text: 'Weak', style: 'rubricLabel', color: '#DC2626' },
                  { text: q.rubric.weak, style: 'rubricText' },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0,
              hLineColor: () => '#E5E7EB',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          },
        ],
      });
    });

    // ── Footer note ────────────────────────────────────────────────────────
    content.push({
      text: `Generated on ${new Date().toLocaleDateString()}`,
      style: 'footer',
      margin: [0, 20, 0, 0],
    });

    return {
      content,
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      styles: {
        title: { fontSize: 20, bold: true, color: '#111827' },
        sectionHeader: { fontSize: 13, bold: true, color: '#1F2937', margin: [0, 0, 0, 6] },
        label: { bold: true, fontSize: 9, color: '#374151' },
        value: { fontSize: 9, color: '#111827' },
        summary: { fontSize: 10, color: '#374151', italics: true },
        questionText: { fontSize: 11, bold: true, color: '#111827' },
        typeBadge: { fontSize: 9, bold: true },
        rubricLabel: { fontSize: 9, bold: true },
        rubricText: { fontSize: 9, color: '#374151' },
        footer: { fontSize: 8, color: '#9CA3AF', italics: true },
      },
      pageMargins: [40, 40, 40, 40],
    };
  }
}
