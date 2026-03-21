"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewKitPdfService = void 0;
const common_1 = require("@nestjs/common");
const path = require("path");
const pdfmake = require('pdfmake');
const FONTS = {
    Roboto: {
        normal: path.join(__dirname, '../../node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf'),
        bold: path.join(__dirname, '../../node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf'),
        italics: path.join(__dirname, '../../node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '../../node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf'),
    },
};
pdfmake.addFonts(FONTS);
pdfmake.setUrlAccessPolicy(() => false);
let InterviewKitPdfService = class InterviewKitPdfService {
    async generatePdf(kit, profile) {
        const docDefinition = this.buildDocDefinition(kit, profile);
        const pdfDoc = pdfmake.createPdf(docDefinition);
        return pdfDoc.getBuffer();
    }
    buildDocDefinition(kit, profile) {
        const content = [];
        content.push({
            text: 'Interview Kit',
            style: 'title',
            margin: [0, 0, 0, 4],
        });
        content.push({
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#CCCCCC' }],
            margin: [0, 0, 0, 12],
        });
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
        content.push({ text: 'Interview Questions', style: 'sectionHeader' });
        kit.questions.forEach((q, idx) => {
            const typeLabel = q.type.charAt(0).toUpperCase() + q.type.slice(1);
            const typeBadgeColor = q.type === 'behavioral' ? '#2563EB' : q.type === 'technical' ? '#16A34A' : '#D97706';
            content.push({
                margin: [0, 8, 0, 0],
                stack: [
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
};
exports.InterviewKitPdfService = InterviewKitPdfService;
exports.InterviewKitPdfService = InterviewKitPdfService = __decorate([
    (0, common_1.Injectable)()
], InterviewKitPdfService);
//# sourceMappingURL=interview-kit-pdf.service.js.map