package com.example.splitwise.service;

import com.example.splitwise.model.Expense;
import com.example.splitwise.model.User;
import com.itextpdf.text.*;
import com.itextpdf.text.Document;
import com.itextpdf.text.pdf.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class ExportService {

    private static final DateTimeFormatter FMT =
        DateTimeFormatter.ofPattern("dd MMM yyyy")
                         .withZone(ZoneId.systemDefault());
    public byte[] generatePdf(User user, List<Expense> expenses, Map<String, String> userIdToName, Map<String, String> groupIdToName) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new com.itextpdf.text.Document(PageSize.A4, 40, 40, 50, 50);
        PdfWriter.getInstance(doc, out);
        doc.open();

        com.itextpdf.text.Font titleFont =
            new com.itextpdf.text.Font(
                com.itextpdf.text.Font.FontFamily.HELVETICA, 18,
                com.itextpdf.text.Font.BOLD, BaseColor.BLACK);
        com.itextpdf.text.Font headFont =
            new com.itextpdf.text.Font(
                com.itextpdf.text.Font.FontFamily.HELVETICA, 11,
                com.itextpdf.text.Font.BOLD, BaseColor.WHITE);
        com.itextpdf.text.Font bodyFont =
            new com.itextpdf.text.Font(
                com.itextpdf.text.Font.FontFamily.HELVETICA, 10,
                com.itextpdf.text.Font.NORMAL, BaseColor.BLACK);

        Paragraph title = new Paragraph("Expense Report", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        doc.add(title);

        doc.add(new Paragraph("Generated for: " + user.getName()
            + " (" + user.getEmail() + ")", bodyFont));
        doc.add(new Paragraph("Date: " + FMT.format(Instant.now()), bodyFont));
        doc.add(new Paragraph("Total expenses: " + expenses.size(), bodyFont));
        doc.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3f, 2f, 1.5f, 2f, 2f, 2f, 2f});

        BaseColor headerColor = new BaseColor(83, 74, 183);
        String[] headers = {"Description","Amount","Currency",
                            "Paid By","Type","Date","Group"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headFont));
            cell.setBackgroundColor(headerColor);
            cell.setPadding(7);
            table.addCell(cell);
        }

        boolean alt = false;
        for (Expense e : expenses) {
            BaseColor rowColor = alt
                ? new BaseColor(245, 245, 252)
                : BaseColor.WHITE;
            alt = !alt;

            String paidBy = userIdToName.getOrDefault(e.getPayerId(), e.getPayerId());
            String groupName = (e.getType() != null && e.getType().name().equals("GROUP"))
                ? groupIdToName.getOrDefault(e.getGroupId(), e.getGroupId() != null ? e.getGroupId() : "Group")
                : "Personal";

            String[] row = {
                e.getDescription(),
                String.valueOf(e.getAmount()),
                e.getCurrency() != null ? e.getCurrency() : "INR",
                paidBy,
                e.getType() != null ? e.getType().name() : "—",
                e.getCreatedAt() != null ? FMT.format(e.getCreatedAt()) : "—",
                groupName
            };
            for (String val : row) {
                PdfPCell cell = new PdfPCell(new Phrase(val, bodyFont));
                cell.setBackgroundColor(rowColor);
                cell.setPadding(6);
                table.addCell(cell);
            }
        }

        doc.add(table);
        doc.close();
        return out.toByteArray();
    }

    public byte[] generateExcel(User user, List<Expense> expenses, Map<String, String> userIdToName, Map<String, String> groupIdToName) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Expenses");

            CellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(
                IndexedColors.INDIGO.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            CellStyle altStyle = wb.createCellStyle();
            altStyle.setFillForegroundColor(
                IndexedColors.LAVENDER.getIndex());
            altStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(
                "Expense Report — " + user.getName());
            CellStyle titleStyle = wb.createCellStyle();
            Font titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);

            Row metaRow = sheet.createRow(1);
            metaRow.createCell(0).setCellValue(
                "Generated: " + FMT.format(Instant.now())
                + "  |  Total: " + expenses.size() + " expenses");

            sheet.createRow(2);

            Row headerRow = sheet.createRow(3);
            String[] cols = {"#","Description","Amount","Currency",
                             "Paid By","Type","Date","Group"};
            for (int i = 0; i < cols.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(cols[i]);
                c.setCellStyle(headerStyle);
            }

            for (int i = 0; i < expenses.size(); i++) {
                Expense e = expenses.get(i);
                Row row = sheet.createRow(4 + i);
                if (i % 2 == 1) {
                    for (int j = 0; j < cols.length; j++)
                        row.createCell(j).setCellStyle(altStyle);
                }
                String paidBy = userIdToName.getOrDefault(e.getPayerId(), e.getPayerId());
                String groupName = (e.getType() != null && e.getType().name().equals("GROUP"))
                    ? groupIdToName.getOrDefault(e.getGroupId(), e.getGroupId() != null ? e.getGroupId() : "Group")
                    : "Personal";
                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(e.getDescription());
                row.createCell(2).setCellValue(
                    e.getAmount().doubleValue());
                row.createCell(3).setCellValue(
                    e.getCurrency() != null ? e.getCurrency() : "INR");
                row.createCell(4).setCellValue(paidBy);
                row.createCell(5).setCellValue(
                    e.getType() != null ? e.getType().name() : "—");
                row.createCell(6).setCellValue(
                    e.getCreatedAt() != null
                        ? FMT.format(e.getCreatedAt()) : "—");
                row.createCell(7).setCellValue(groupName);
            }

            for (int i = 0; i < cols.length; i++)
                sheet.autoSizeColumn(i);

            wb.write(out);
        }
        return out.toByteArray();
    }

    public byte[] generateWord(User user, List<Expense> expenses, Map<String, String> userIdToName, Map<String, String> groupIdToName) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (XWPFDocument doc = new org.apache.poi.xwpf.usermodel.XWPFDocument()) {

            XWPFParagraph titlePara = doc.createParagraph();
            titlePara.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun titleRun = titlePara.createRun();
            titleRun.setText("Expense Report");
            titleRun.setBold(true);
            titleRun.setFontSize(20);
            titleRun.setColor("534AB7");

            // meta
            XWPFParagraph meta = doc.createParagraph();
            XWPFRun metaRun = meta.createRun();
            metaRun.setText("Name: " + user.getName()
                + "  |  Email: " + user.getEmail()
                + "  |  Date: " + FMT.format(Instant.now()));
            metaRun.setFontSize(10);
            metaRun.setColor("888888");

            doc.createParagraph();

            XWPFTable table = doc.createTable(
                expenses.size() + 1, 6);
            table.setWidth("100%");

            String[] headers = {"Description","Amount","Currency",
                                 "Paid By","Type","Date"};
            XWPFTableRow headerRow = table.getRow(0);
            for (int i = 0; i < headers.length; i++) {
                XWPFTableCell cell = headerRow.getCell(i);
                cell.setColor("534AB7");
                XWPFParagraph p = cell.getParagraphs().get(0);
                XWPFRun r = p.createRun();
                r.setText(headers[i]);
                r.setBold(true);
                r.setColor("FFFFFF");
                r.setFontSize(10);
            }

            for (int i = 0; i < expenses.size(); i++) {
                Expense e = expenses.get(i);
                XWPFTableRow row = table.getRow(i + 1);
                String[] vals = {
                    e.getDescription(),
                    e.getAmount().toString(),
                    e.getCurrency() != null ? e.getCurrency() : "INR",
                    e.getPayerId(),
                    e.getType() != null ? e.getType().name() : "—",
                    e.getCreatedAt() != null
                        ? FMT.format(e.getCreatedAt()) : "—"
                };
                // alternate row shading
                String bg = (i % 2 == 0) ? "FFFFFF" : "F0EFFE";
                for (int j = 0; j < vals.length; j++) {
                    XWPFTableCell cell = row.getCell(j);
                    cell.setColor(bg);
                    XWPFParagraph p = cell.getParagraphs().get(0);
                    XWPFRun r = p.createRun();
                    r.setText(vals[j]);
                    r.setFontSize(9);
                }
            }

            doc.write(out);
        }
        return out.toByteArray();
    }
}