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
    y += 5;
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
  doc.text(`Due Date: ${invoice.dueDate}`, 196, 40, { align: 'right' });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 196, 46, { align: 'right' });

  // Divider
  const boxTop = Math.max(y + 4, 52);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, boxTop, 196, boxTop);

  // Customer & Branch Details Section (Two Columns or Structured Box)
  let custY = boxTop + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('BILLED TO:', 14, custY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(customer.registeredName, 14, custY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let cY = custY + 11;

  if (customer.tradingName && customer.tradingName !== customer.registeredName) {
    doc.text(`Trading Name: ${customer.tradingName}`, 14, cY);
    cY += 4.5;
  }
  doc.text(`Customer Code: ${customer.code}`, 14, cY);
  cY += 4.5;

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
  const tableStartY = Math.max(cY + 6, branch ? boxTop + 45 : cY + 6);

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

  // Header Left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(company.name || 'Company Name', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(company.address || '', 90), 14, 26);
  doc.text(`Phone: ${company.phone} | Email: ${company.email}`, 14, 38);

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
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 46, 196, 46);

  // Customer & Delivery Address Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('DELIVER TO:', 14, 53);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(branch ? `${customer.registeredName} - ${branch.name}` : customer.registeredName, 14, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let addrY = 66;

  const address = deliveryNote.deliveryAddress || (branch ? branch.address : customer.address);
  const addrLines = doc.splitTextToSize(`Address: ${address}`, 100);
  doc.text(addrLines, 14, addrY);
  addrY += addrLines.length * 4.5;

  const contactName = deliveryNote.recipientContact || (branch ? branch.contactPerson : customer.contactPerson);
  const contactPhone = deliveryNote.recipientPhone || (branch ? branch.phone : customer.phone);
  doc.text(`Recipient Contact: ${contactName} (${contactPhone})`, 14, addrY);

  // Drivers Notes Right Side
  if (deliveryNote.driverNotes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('SPECIAL INSTRUCTIONS:', 120, 53);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const driverLines = doc.splitTextToSize(deliveryNote.driverNotes, 75);
    doc.text(driverLines, 120, 59);
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

  autoTable(doc, {
    startY: Math.max(addrY + 8, 80),
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

  const finalY = (doc as any).lastAutoTable.finalY + 20;

  // Signatures Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('DISPATCHED BY (Driver/Warehouse):', 14, finalY);
  doc.text('RECEIVED BY (Customer Sign-off):', 110, finalY);

  doc.setDrawColor(148, 163, 184);
  doc.line(14, finalY + 15, 85, finalY + 15);
  doc.line(110, finalY + 15, 185, finalY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature & Date', 14, finalY + 20);
  doc.text('Print Name, Signature & Date', 110, finalY + 20);

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

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(company.name || 'Company Name', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(company.address || '', 90), 14, 26);
  doc.text(`Phone: ${company.phone} | Email: ${company.email}`, 14, 38);

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

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 46, 196, 46);

  // Customer info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('QUOTATION PREPARED FOR:', 14, 53);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(customer.registeredName, 14, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let qY = 66;
  if (customer.tradingName && customer.tradingName !== customer.registeredName) {
    doc.text(`Trading Name: ${customer.tradingName}`, 14, qY);
    qY += 4.5;
  }
  doc.text(`Address: ${customer.address || 'N/A'}`, 14, qY);
  qY += 4.5;
  doc.text(`Contact: ${customer.contactPerson} (${customer.phone})`, 14, qY);
  qY += 4.5;
  doc.text(`Email: ${customer.email}`, 14, qY);
  qY += 4.5;
  if (customer.taxNumber || customer.vatNumber) {
    doc.text(`Tax ID: ${customer.taxNumber || 'N/A'} | VAT ID: ${customer.vatNumber || 'N/A'}`, 14, qY);
    qY += 4.5;
  }

  if (branch) {
    let brY = 53;
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

  const tableStartY = Math.max(qY + 6, branch ? 95 : qY + 6);

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

  // Company Letterhead
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(company.name || 'Company Name', 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('CONSOLIDATED FINANCIAL & SALES REPORT', 196, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 196, 25, { align: 'right' });
  doc.text(`Report Period: ${periodLabel.toUpperCase()}`, 196, 30, { align: 'right' });

  // Filter Details Subtitle
  let filterText = 'Filter Context: ';
  if (filter.customerId && filter.customerId !== 'all') {
    const cust = customers.find(c => c.id === filter.customerId);
    filterText += `Customer: ${cust ? cust.registeredName : 'Selected'} | `;
    if (filter.branchId && filter.branchId !== 'all' && cust) {
      const br = cust.branches.find(b => b.id === filter.branchId);
      filterText += `Branch: ${br ? br.name : 'Selected'}`;
    } else {
      filterText += 'All Branches';
    }
  } else {
    filterText += 'All Customers & All Branches';
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(filterText, 14, 28);

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 34, 196, 34);

  // Financial Metrics Summary Box
  const totalInvoiced = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.amountPaid, 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + i.balanceDue, 0);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INVOICED', 20, 45);
  doc.text('TOTAL COLLECTED', 80, 45);
  doc.text('OUTSTANDING BALANCE', 140, 45);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totalInvoiced, currency), 20, 54);
  doc.setTextColor(22, 101, 52); // Green
  doc.text(formatCurrency(totalCollected, currency), 80, 54);
  doc.setTextColor(totalOutstanding > 0 ? 180 : 22, totalOutstanding > 0 ? 30 : 101, totalOutstanding > 0 ? 30 : 52);
  doc.text(formatCurrency(totalOutstanding, currency), 140, 54);

  // Invoices Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Invoice Breakdown', 14, 68);

  const tableData = invoices.map(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    const branch = cust?.branches.find(b => b.id === inv.branchId);
    return [
      inv.invoiceNumber,
      inv.issueDate,
      cust ? cust.registeredName : 'Unknown',
      branch ? branch.name : 'Main / N/A',
      inv.status,
      formatCurrency(inv.totalAmount, currency),
      formatCurrency(inv.amountPaid, currency),
      formatCurrency(inv.balanceDue, currency)
    ];
  });

  autoTable(doc, {
    startY: 72,
    head: [['Inv No', 'Date', 'Customer', 'Branch', 'Status', 'Total', 'Paid', 'Balance']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'No records found for period', '-', '-', 'R 0.00', 'R 0.00', 'R 0.00']],
    theme: 'striped',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [250, 204, 21],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]
    }
  });

  let nextY = (doc as any).lastAutoTable.finalY + 10;

  // Payments Table
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Payment Receipts Log', 14, nextY);

  const payData = payments.map(p => {
    const cust = customers.find(c => c.id === p.customerId);
    const branch = cust?.branches.find(b => b.id === p.branchId);
    return [
      p.paymentDate,
      p.invoiceNumber,
      cust ? cust.registeredName : 'Unknown',
      branch ? branch.name : 'Main / N/A',
      p.paymentMethod,
      p.referenceNumber || '-',
      formatCurrency(p.amount, currency)
    ];
  });

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Date', 'Invoice Ref', 'Customer', 'Branch', 'Method', 'Reference', 'Amount']],
    body: payData.length > 0 ? payData : [['-', '-', 'No payment receipts recorded', '-', '-', '-', 'R 0.00']],
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [250, 204, 21],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]
    }
  });

  // Footer / Audit signature
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This consolidated report is generated automatically for accounting, taxation, and auditing records.', 14, finalY);

  doc.save(`Consolidated_Report_${periodLabel}_${new Date().toISOString().slice(0,10)}.pdf`);
}
