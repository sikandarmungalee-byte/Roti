import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Customer, Branch, Invoice, DeliveryNote, Quotation, PaymentRecord, ConsolidatedReportFilter } from '../types';

export function formatCurrency(amount: number, symbol: string = 'R'): string {
  const formatted = amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${formatted}`;
}

// ------------------- INVOICE PDF -------------------
export function generateInvoicePDF(
  invoice: Invoice,
  customer: Customer,
  branch: Branch | undefined,
  company: CompanySettings
) {
  const doc = new jsPDF();
  const currency = company.currencySymbol || 'R';

  // South Africa Gold/Yellow Top Brand Line
  doc.setFillColor(234, 179, 8); // Gold Yellow
  doc.rect(0, 0, 210, 4, 'F');

  // Header - Company Info (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Black / Dark Slate
  doc.text(company.name || 'Company Name', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  let y = 26;
  if (company.tradingName && company.tradingName !== company.name) {
    doc.text(`Trading as: ${company.tradingName}`, 14, y);
    y += 4.5;
  }
  const compAddressLines = doc.splitTextToSize(company.address || '', 85);
  doc.text(compAddressLines, 14, y);
  y += compAddressLines.length * 4.5;
  doc.text(`Email: ${company.email} | Tel: ${company.phone}`, 14, y);
  y += 4.5;
  if (company.taxNumber || company.vatNumber) {
    doc.text(`Tax No: ${company.taxNumber || 'N/A'} | VAT No: ${company.vatNumber || 'N/A'}`, 14, y);
    y += 4.5;
  }
  if (company.registrationNumber) {
    doc.text(`Reg No: ${company.registrationNumber}`, 14, y);
    y += 4.5;
  }

  // Header Right - INVOICE Title & Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text('TAX INVOICE', 196, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 196, 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Issue Date: ${invoice.issueDate}`, 196, 34, { align: 'right' });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 196, 40, { align: 'right' });

  // Divider
  const boxTop = Math.max(y + 4, 52);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, boxTop, 196, boxTop);

  // Customer & Branch Details Section (Two Columns)
  let custY = boxTop + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('BILLED TO (CUSTOMER DETAILS):', 14, custY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${customer.registeredName} (${customer.code})`, 14, custY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let cY = custY + 11;

  if (customer.tradingName && customer.tradingName !== customer.registeredName) {
    doc.text(`Trading Name: ${customer.tradingName}`, 14, cY);
    cY += 4.5;
  }
  if (customer.registrationNumber) {
    doc.text(`Reg No: ${customer.registrationNumber}`, 14, cY);
    cY += 4.5;
  }

  const addressLines = doc.splitTextToSize(customer.address || '', 85);
  doc.text(addressLines, 14, cY);
  cY += addressLines.length * 4.5;

  doc.text(`Contact: ${customer.contactPerson} (${customer.phone})`, 14, cY);
  cY += 4.5;
  doc.text(`Email: ${customer.email}`, 14, cY);
  cY += 4.5;

  if (customer.taxNumber || customer.vatNumber) {
    doc.text(`Tax ID: ${customer.taxNumber || 'N/A'} | VAT ID: ${customer.vatNumber || 'N/A'}`, 14, cY);
    cY += 4.5;
  }

  // If Branch exists
  if (branch) {
    let brY = boxTop + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('DELIVERY / BRANCH LOCATION:', 110, brY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${branch.name} (${branch.code})`, 110, brY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    let bLine = brY + 11;

    const brAddressLines = doc.splitTextToSize(branch.address || '', 85);
    doc.text(brAddressLines, 110, bLine);
    bLine += brAddressLines.length * 4.5;

    doc.text(`Contact: ${branch.contactPerson} (${branch.phone})`, 110, bLine);
    bLine += 4.5;
    doc.text(`Email: ${branch.email}`, 110, bLine);
    bLine += 4.5;
    if (branch.registrationNumber) {
      doc.text(`Branch Reg No: ${branch.registrationNumber}`, 110, bLine);
      bLine += 4.5;
    }
    if (branch.taxNumber || branch.vatNumber) {
      doc.text(`Tax ID: ${branch.taxNumber || 'N/A'} | VAT ID: ${branch.vatNumber || 'N/A'}`, 110, bLine);
      bLine += 4.5;
    }
  }

  // Items Table
  const tableStartY = Math.max(cY + 6, branch ? boxTop + 48 : cY + 6);

  const tableData = invoice.items.map((item, idx) => [
    idx + 1,
    `${item.productName}\n${item.description ? item.description : ''}`,
    `${item.packQuantity || 1} units/pack`,
    item.size || '-',
    item.quantity,
    formatCurrency(item.unitPrice, currency),
    formatCurrency(item.totalPrice, currency)
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Item & Description', 'Pack Qty', 'Size', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [250, 204, 21],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 65 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' }
    }
  });

  // Totals Summary
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Banking Details on Left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('PAYMENT & BANKING DETAILS:', 14, finalY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  let bankY = finalY + 5;
  doc.text(`Bank: ${company.bankName || 'N/A'}`, 14, bankY);
  bankY += 4.5;
  doc.text(`Account Name: ${company.accountName || 'N/A'}`, 14, bankY);
  bankY += 4.5;
  doc.text(`Account Number: ${company.accountNumber || 'N/A'}`, 14, bankY);
  bankY += 4.5;
  doc.text(`Branch Code: ${company.branchCode || 'N/A'}`, 14, bankY);
  if (company.swiftCode) {
    bankY += 4.5;
    doc.text(`SWIFT / BIC: ${company.swiftCode}`, 14, bankY);
  }

  // Subtotal, Tax, Total on Right
  let totalX = 130;
  let totalY = finalY;

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalX, totalY);
  doc.text(formatCurrency(invoice.subtotal, currency), 196, totalY, { align: 'right' });
  totalY += 5;

  doc.text(`Tax / VAT (${invoice.taxRate}%):`, totalX, totalY);
  doc.text(formatCurrency(invoice.taxAmount, currency), 196, totalY, { align: 'right' });
  totalY += 5;

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(totalX, totalY, 196, totalY);
  totalY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Amount:', totalX, totalY);
  doc.text(formatCurrency(invoice.totalAmount, currency), 196, totalY, { align: 'right' });
  totalY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Amount Paid:', totalX, totalY);
  doc.text(formatCurrency(invoice.amountPaid, currency), 196, totalY, { align: 'right' });
  totalY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(invoice.balanceDue > 0 ? 180 : 16, invoice.balanceDue > 0 ? 30 : 185, invoice.balanceDue > 0 ? 30 : 129);
  doc.text('Balance Due:', totalX, totalY);
  doc.text(formatCurrency(invoice.balanceDue, currency), 196, totalY, { align: 'right' });

  // Notes & Terms Footer
  const footerY = Math.max(bankY + 8, totalY + 8);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, 196, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Terms & Notes:', 14, footerY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const termsText = invoice.notes ? `${invoice.notes}\n\n${company.defaultTerms}` : company.defaultTerms;
  const splitTerms = doc.splitTextToSize(termsText, 180);
  doc.text(splitTerms, 14, footerY + 10);

  // Download trigger
  doc.save(`${invoice.invoiceNumber}_${customer.registeredName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

// ------------------- DELIVERY NOTE PDF -------------------
export function generateDeliveryNotePDF(
  deliveryNote: DeliveryNote,
  customer: Customer,
  branch: Branch | undefined,
  company: CompanySettings
) {
  const doc = new jsPDF();

  // SA Gold/Yellow Accent Line
  doc.setFillColor(234, 179, 8);
  doc.rect(0, 0, 210, 4, 'F');

  // Header Left - Company Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(company.name || 'Company Name', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  let compY = 26;
  if (company.tradingName && company.tradingName !== company.name) {
    doc.text(`Trading as: ${company.tradingName}`, 14, compY);
    compY += 4.5;
  }
  const compAddr = doc.splitTextToSize(company.address || '', 85);
  doc.text(compAddr, 14, compY);
  compY += compAddr.length * 4.5;
  doc.text(`Phone: ${company.phone} | Email: ${company.email}`, 14, compY);
  compY += 4.5;
  if (company.taxNumber || company.vatNumber) {
    doc.text(`Tax No: ${company.taxNumber || 'N/A'} | VAT No: ${company.vatNumber || 'N/A'}`, 14, compY);
    compY += 4.5;
  }
  if (company.registrationNumber) {
    doc.text(`Reg No: ${company.registrationNumber}`, 14, compY);
    compY += 4.5;
  }

  // Header Right - DELIVERY NOTE Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text('DELIVERY NOTE', 196, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.text(`Note No: ${deliveryNote.deliveryNoteNumber}`, 196, 28, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${deliveryNote.issueDate}`, 196, 34, { align: 'right' });
  if (deliveryNote.invoiceId) {
    doc.text(`Ref Invoice: ${deliveryNote.invoiceId}`, 196, 40, { align: 'right' });
  }

  // Line Divider
  const boxTop = Math.max(compY + 4, 52);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, boxTop, 196, boxTop);

  // Customer Details (Left) & Branch / Delivery Location Details (Right)
  let custY = boxTop + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('CUSTOMER / ACCOUNT HOLDER:', 14, custY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${customer.registeredName} (${customer.code})`, 14, custY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let cY = custY + 11;

  if (customer.tradingName && customer.tradingName !== customer.registeredName) {
    doc.text(`Trading Name: ${customer.tradingName}`, 14, cY);
    cY += 4.5;
  }
  if (customer.registrationNumber) {
    doc.text(`Reg No: ${customer.registrationNumber}`, 14, cY);
    cY += 4.5;
  }
  const custAddress = doc.splitTextToSize(customer.address || '', 85);
  doc.text(custAddress, 14, cY);
  cY += custAddress.length * 4.5;
  doc.text(`Contact: ${customer.contactPerson} (${customer.phone})`, 14, cY);
  cY += 4.5;
  doc.text(`Email: ${customer.email}`, 14, cY);
  cY += 4.5;
  if (customer.taxNumber || customer.vatNumber) {
    doc.text(`Tax ID: ${customer.taxNumber || 'N/A'} | VAT ID: ${customer.vatNumber || 'N/A'}`, 14, cY);
    cY += 4.5;
  }

  // Right Column: Delivery Branch Location (Only rendered if a branch is specified)
  let bLine = boxTop + 6;
  if (branch) {
    let brY = boxTop + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('DELIVER TO (BRANCH LOCATION):', 110, brY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${branch.name} (${branch.code})`, 110, brY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    bLine = brY + 11;

    const delAddress = deliveryNote.deliveryAddress || branch.address;
    const brAddrLines = doc.splitTextToSize(delAddress || '', 85);
    doc.text(brAddrLines, 110, bLine);
    bLine += brAddrLines.length * 4.5;

    const contactName = deliveryNote.recipientContact || branch.contactPerson;
    const contactPhone = deliveryNote.recipientPhone || branch.phone;
    doc.text(`Contact: ${contactName} (${contactPhone})`, 110, bLine);
    bLine += 4.5;

    doc.text(`Email: ${branch.email}`, 110, bLine);
    bLine += 4.5;
    if (branch.registrationNumber) {
      doc.text(`Branch Reg No: ${branch.registrationNumber}`, 110, bLine);
      bLine += 4.5;
    }
    if (branch.taxNumber || branch.vatNumber) {
      doc.text(`Tax ID: ${branch.taxNumber || 'N/A'} | VAT ID: ${branch.vatNumber || 'N/A'}`, 110, bLine);
      bLine += 4.5;
    }

    if (deliveryNote.driverNotes) {
      bLine += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Driver Notes:', 110, bLine);
      doc.setFont('helvetica', 'normal');
      const driverLines = doc.splitTextToSize(deliveryNote.driverNotes, 85);
      doc.text(driverLines, 110, bLine + 4.5);
      bLine += 4.5 + (driverLines.length * 4.5);
    }
  }

  // Items Table (Focus on Quantities, Pack Sizes, & Descriptions for warehouse/delivery)
  const tableData = deliveryNote.items.map((item, idx) => [
    idx + 1,
    item.productName,
    item.description || '-',
    `${item.packQuantity || 1} units/pack`,
    item.size || '-',
    item.quantity,
    '[   ] Checked'
  ]);

  const tableStartY = Math.max(cY + 6, bLine + 6);

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Item Name', 'Description', 'Pack Size', 'Unit Size', 'Qty Delivered', 'Verification']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [250, 204, 21],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 45 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 16;

  // Signatures Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('DISPATCHED BY (Driver/Warehouse):', 14, finalY);
  doc.text('RECEIVED BY (Customer Sign-off):', 110, finalY);

  doc.setDrawColor(148, 163, 184);
  doc.line(14, finalY + 14, 85, finalY + 14);
  doc.line(110, finalY + 14, 185, finalY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature & Date', 14, finalY + 19);
  doc.text('Print Name, Signature & Date', 110, finalY + 19);

  doc.save(`${deliveryNote.deliveryNoteNumber}_${customer.registeredName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

// ------------------- QUOTATION PDF -------------------
export function generateQuotationPDF(
  quotation: Quotation,
  customer: Customer,
  branch: Branch | undefined,
  company: CompanySettings
) {
  const doc = new jsPDF();
  const currency = company.currencySymbol || 'R';

  // SA Gold/Yellow Accent Line
  doc.setFillColor(234, 179, 8);
  doc.rect(0, 0, 210, 4, 'F');

  // Header Left - Company Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(company.name || 'Company Name', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  let compY = 26;
  if (company.tradingName && company.tradingName !== company.name) {
    doc.text(`Trading as: ${company.tradingName}`, 14, compY);
    compY += 4.5;
  }
  const compAddr = doc.splitTextToSize(company.address || '', 85);
  doc.text(compAddr, 14, compY);
  compY += compAddr.length * 4.5;
  doc.text(`Phone: ${company.phone} | Email: ${company.email}`, 14, compY);
  compY += 4.5;
  if (company.taxNumber || company.vatNumber) {
    doc.text(`Tax No: ${company.taxNumber || 'N/A'} | VAT No: ${company.vatNumber || 'N/A'}`, 14, compY);
    compY += 4.5;
  }
  if (company.registrationNumber) {
    doc.text(`Reg No: ${company.registrationNumber}`, 14, compY);
    compY += 4.5;
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text('QUOTATION', 196, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.text(`Quote No: ${quotation.quotationNumber}`, 196, 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Issue Date: ${quotation.issueDate}`, 196, 34, { align: 'right' });
  doc.text(`Valid Until: ${quotation.expiryDate}`, 196, 40, { align: 'right' });

  const boxTop = Math.max(compY + 4, 52);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, boxTop, 196, boxTop);

  // Customer info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('QUOTATION PREPARED FOR:', 14, boxTop + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${customer.registeredName} (${customer.code})`, 14, boxTop + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let qY = boxTop + 17;

  if (customer.tradingName && customer.tradingName !== customer.registeredName) {
    doc.text(`Trading Name: ${customer.tradingName}`, 14, qY);
    qY += 4.5;
  }
  if (customer.registrationNumber) {
    doc.text(`Reg No: ${customer.registrationNumber}`, 14, qY);
    qY += 4.5;
  }
  const custAddr = doc.splitTextToSize(customer.address || '', 85);
  doc.text(custAddr, 14, qY);
  qY += custAddr.length * 4.5;
  doc.text(`Contact: ${customer.contactPerson} (${customer.phone})`, 14, qY);
  qY += 4.5;
  doc.text(`Email: ${customer.email}`, 14, qY);
  qY += 4.5;
  if (customer.taxNumber || customer.vatNumber) {
    doc.text(`Tax ID: ${customer.taxNumber || 'N/A'} | VAT ID: ${customer.vatNumber || 'N/A'}`, 14, qY);
    qY += 4.5;
  }

  if (branch) {
    let brY = boxTop + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('BRANCH / LOCATION:', 110, brY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${branch.name} (${branch.code})`, 110, brY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    let bLine = brY + 11;

    const brAddressLines = doc.splitTextToSize(branch.address || '', 85);
    doc.text(brAddressLines, 110, bLine);
    bLine += brAddressLines.length * 4.5;

    doc.text(`Contact: ${branch.contactPerson} (${branch.phone})`, 110, bLine);
    bLine += 4.5;
    doc.text(`Email: ${branch.email}`, 110, bLine);
    bLine += 4.5;
    if (branch.registrationNumber) {
      doc.text(`Branch Reg No: ${branch.registrationNumber}`, 110, bLine);
      bLine += 4.5;
    }
    if (branch.taxNumber || branch.vatNumber) {
      doc.text(`Tax ID: ${branch.taxNumber || 'N/A'} | VAT ID: ${branch.vatNumber || 'N/A'}`, 110, bLine);
      bLine += 4.5;
    }
  }

  const tableStartY = Math.max(qY + 6, branch ? boxTop + 48 : qY + 6);

  const tableData = quotation.items.map((item, idx) => [
    idx + 1,
    item.productName,
    `${item.packQuantity || 1} units/pack`,
    item.size || '-',
    item.quantity,
    formatCurrency(item.unitPrice, currency),
    formatCurrency(item.totalPrice, currency)
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Product / Service', 'Pack Qty', 'Size', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [250, 204, 21],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  let totalX = 130;
  let totalY = finalY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', totalX, totalY);
  doc.text(formatCurrency(quotation.subtotal, currency), 196, totalY, { align: 'right' });
  totalY += 5;

  doc.text(`Tax / VAT (${quotation.taxRate}%):`, totalX, totalY);
  doc.text(formatCurrency(quotation.taxAmount, currency), 196, totalY, { align: 'right' });
  totalY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Estimated Total:', totalX, totalY);
  doc.text(formatCurrency(quotation.totalAmount, currency), 196, totalY, { align: 'right' });

  if (quotation.notes) {
    totalY += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Quotation Terms & Notes:', 14, totalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(quotation.notes, 180), 14, totalY + 5);
  }

  doc.save(`${quotation.quotationNumber}_${customer.registeredName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

// ------------------- CONSOLIDATED REPORT PDF -------------------
export function generateConsolidatedReportPDF(
  filter: ConsolidatedReportFilter,
  invoices: Invoice[],
  payments: PaymentRecord[],
  customers: Customer[],
  company: CompanySettings,
  periodLabel: string
) {
  const doc = new jsPDF();
  const currency = company.currencySymbol || 'R';

  // SA Gold/Yellow Accent Line
  doc.setFillColor(234, 179, 8);
  doc.rect(0, 0, 210, 4, 'F');

  // Company Title / Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(company.name || 'Company Name', 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('CONSOLIDATED ACCOUNTING REPORT', 196, 18, { align: 'right' });

  const stmtDate = new Date();
  const stmtDateStr = stmtDate.toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const stmtDueDateObj = new Date(stmtDate);
  stmtDueDateObj.setDate(stmtDueDateObj.getDate() + 7);
  const stmtDueDateStr = stmtDueDateObj.toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Statement Date: ${stmtDateStr}`, 196, 22, { align: 'right' });
  doc.text(`Payment Due Date (Net 7 Days): ${stmtDueDateStr}`, 196, 27, { align: 'right' });
  doc.text(`Report Period: ${periodLabel.toUpperCase()}`, 196, 32, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 35, 196, 35);

  // --- ENTITY DETAIL COLUMNS (COMPANY, CUSTOMER, & CONDITIONAL BRANCH) ---
  const selCust = filter.customerId !== 'all' ? customers.find(c => c.id === filter.customerId) : undefined;
  const selBranch = (selCust && filter.branchId !== 'all') ? selCust.branches.find(b => b.id === filter.branchId) : undefined;

  const colStartY = 39;
  const colWidth = selBranch ? 57 : 88;
  const colGap = selBranch ? 4 : 6;
  const boxHeight = 52;

  // Box 1: COMPANY DETAILS
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, colStartY, colWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, colStartY, colWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('ISSUING COMPANY', 18, colStartY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const compNameLines = doc.splitTextToSize(company.name || 'Company', colWidth - 8);
  doc.text(compNameLines, 18, colStartY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  let cLine = colStartY + 10 + (compNameLines.length * 3.5);
  if (company.tradingName && company.tradingName !== company.name) {
    doc.text(`T/A: ${company.tradingName}`, 18, cLine);
    cLine += 3.5;
  }
  doc.text(`Reg: ${company.registrationNumber || 'N/A'}`, 18, cLine);
  cLine += 3.5;
  doc.text(`Tax: ${company.taxNumber || 'N/A'} | VAT: ${company.vatNumber || 'N/A'}`, 18, cLine);
  cLine += 3.5;
  if (company.address) {
    const compAddrLines = doc.splitTextToSize(company.address, colWidth - 8);
    doc.text(compAddrLines, 18, cLine);
    cLine += (compAddrLines.length * 3.5);
  }
  doc.text(`Tel: ${company.phone || 'N/A'}`, 18, cLine);
  cLine += 3.5;
  doc.text(`Email: ${company.email || 'N/A'}`, 18, cLine);

  // Box 2: CUSTOMER DETAILS
  const custX = 14 + colWidth + colGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(custX, colStartY, colWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(custX, colStartY, colWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('CUSTOMER DETAILS', custX + 4, colStartY + 5);

  if (selCust) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const custNameLines = doc.splitTextToSize(`${selCust.registeredName} (${selCust.code})`, colWidth - 8);
    doc.text(custNameLines, custX + 4, colStartY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    let cuLine = colStartY + 10 + (custNameLines.length * 3.5);
    if (selCust.tradingName && selCust.tradingName !== selCust.registeredName) {
      doc.text(`T/A: ${selCust.tradingName}`, custX + 4, cuLine);
      cuLine += 3.5;
    }
    doc.text(`Reg: ${selCust.registrationNumber || 'N/A'}`, custX + 4, cuLine);
    cuLine += 3.5;
    doc.text(`Tax: ${selCust.taxNumber || 'N/A'} | VAT: ${selCust.vatNumber || 'N/A'}`, custX + 4, cuLine);
    cuLine += 3.5;
    if (selCust.address) {
      const custAddrLines = doc.splitTextToSize(selCust.address, colWidth - 8);
      doc.text(custAddrLines, custX + 4, cuLine);
      cuLine += (custAddrLines.length * 3.5);
    }
    doc.text(`Contact: ${selCust.contactPerson || 'N/A'} (${selCust.phone || 'N/A'})`, custX + 4, cuLine);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('ALL CUSTOMERS CONSOLIDATED', custX + 4, colStartY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Scope: Full Customer Directory`, custX + 4, colStartY + 18);
    doc.text(`Total Accounts: ${customers.length} Active Customers`, custX + 4, colStartY + 23);
    doc.text(`Report includes all billed entities.`, custX + 4, colStartY + 28);
  }

  // Box 3: BRANCH DETAILS (Only added if a specific branch is selected)
  if (selBranch) {
    const branchX = custX + colWidth + colGap;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(branchX, colStartY, colWidth, boxHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(branchX, colStartY, colWidth, boxHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('BRANCH LOCATION', branchX + 4, colStartY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const brNameLines = doc.splitTextToSize(`${selBranch.name} (${selBranch.code})`, colWidth - 8);
    doc.text(brNameLines, branchX + 4, colStartY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    let bLine = colStartY + 10 + (brNameLines.length * 3.5);
    doc.text(`Branch Reg: ${selBranch.registrationNumber || 'N/A'}`, branchX + 4, bLine);
    bLine += 3.5;
    doc.text(`Tax: ${selBranch.taxNumber || 'N/A'} | VAT: ${selBranch.vatNumber || 'N/A'}`, branchX + 4, bLine);
    bLine += 3.5;
    if (selBranch.address) {
      const brAddrLines = doc.splitTextToSize(selBranch.address, colWidth - 8);
      doc.text(brAddrLines, branchX + 4, bLine);
      bLine += (brAddrLines.length * 3.5);
    }
    doc.text(`Contact: ${selBranch.contactPerson || 'N/A'} (${selBranch.phone || 'N/A'})`, branchX + 4, bLine);
  }

  // --- FINANCIAL METRICS SUMMARY BOX ---
  const summaryY = colStartY + boxHeight + 4;
  const totalInvoiced = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.amountPaid, 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + i.balanceDue, 0);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, summaryY, 182, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INVOICED', 20, summaryY + 6);
  doc.text('TOTAL COLLECTED', 80, summaryY + 6);
  doc.text('OUTSTANDING BALANCE', 140, summaryY + 6);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totalInvoiced, currency), 20, summaryY + 13);
  doc.setTextColor(22, 101, 52); // Green
  doc.text(formatCurrency(totalCollected, currency), 80, summaryY + 13);
  doc.setTextColor(totalOutstanding > 0 ? 180 : 22, totalOutstanding > 0 ? 30 : 101, totalOutstanding > 0 ? 30 : 52);
  doc.text(formatCurrency(totalOutstanding, currency), 140, summaryY + 13);

  // --- INVOICES TABLE ---
  const tableStartY = summaryY + 23;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Invoices & Sales Ledger Breakdown', 14, tableStartY);

  const tableData = invoices.map(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    const branch = cust?.branches.find(b => b.id === inv.branchId);
    return [
      inv.invoiceNumber,
      inv.issueDate,
      cust ? `${cust.registeredName} (${cust.code})` : 'Unknown',
      branch ? `${branch.name} (${branch.code})` : 'Main / Head Office',
      inv.status,
      formatCurrency(inv.totalAmount, currency),
      formatCurrency(inv.amountPaid, currency),
      formatCurrency(inv.balanceDue, currency)
    ];
  });

  autoTable(doc, {
    startY: tableStartY + 3,
    head: [['Inv No', 'Date', 'Customer (Code)', 'Branch (Code)', 'Status', 'Total', 'Paid', 'Balance']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'No records found for period', '-', '-', 'R 0.00', 'R 0.00', 'R 0.00']],
    theme: 'striped',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [250, 204, 21],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85]
    }
  });

  let nextY = (doc as any).lastAutoTable.finalY + 10;

  // --- PAYMENTS TABLE ---
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Payment Receipts Log', 14, nextY);

  const payData = payments.map(p => {
    const cust = customers.find(c => c.id === p.customerId);
    const branch = cust?.branches.find(b => b.id === p.branchId);
    return [
      p.paymentDate,
      p.invoiceNumber,
      cust ? `${cust.registeredName} (${cust.code})` : 'Unknown',
      branch ? `${branch.name} (${branch.code})` : 'Main / Head Office',
      p.paymentMethod,
      p.referenceNumber || '-',
      formatCurrency(p.amount, currency)
    ];
  });

  autoTable(doc, {
    startY: nextY + 3,
    head: [['Date', 'Invoice Ref', 'Customer (Code)', 'Branch (Code)', 'Method', 'Reference', 'Amount']],
    body: payData.length > 0 ? payData : [['-', '-', 'No payment receipts recorded', '-', '-', '-', 'R 0.00']],
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [250, 204, 21],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85]
    }
  });

  // Footer / Audit signature
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This consolidated financial report contains full company, customer account, and branch audit trails.', 14, finalY);

  doc.save(`Consolidated_Report_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
}
