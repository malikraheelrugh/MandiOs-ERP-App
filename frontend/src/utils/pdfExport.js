import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates and triggers download of a PDF document for Customer or Supplier Ledger.
 */
export const downloadLedgerPDF = ({
  partyType = 'Customer', // 'Customer' or 'Supplier'
  partyDetails = {},
  ledgerEntries = [],
  totals = {}
}) => {
  const doc = new jsPDF();
  const title = partyType === 'Supplier' 
    ? 'SUPPLIER CONSIGNMENT STATEMENT LEDGER' 
    : 'CUSTOMER ACCOUNT STATEMENT LEDGER';

  // Header Banner Background
  doc.setFillColor(79, 70, 229); // #4F46E5
  doc.rect(0, 0, 210, 28, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LAHORE SABZI & FRUIT MANDI BROKERAGE', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 20);

  // Date on Header Right
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 196, 20, { align: 'right' });

  // Party Information Card
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 34, 182, 28, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 34, 182, 28, 3, 3, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${partyType}: ${partyDetails?.name || 'All Accounts'}`, 18, 42);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Phone: ${partyDetails?.phone || 'N/A'}`, 18, 48);
  doc.text(`City: ${partyDetails?.city || 'Mandi Market'}`, 18, 54);

  const bal = totals.currentBalance !== undefined ? totals.currentBalance : (partyDetails?.currentBalance || 0);
  doc.setFont('helvetica', 'bold');
  const balText = partyType === 'Supplier' 
    ? `Net Payable Balance: Rs. ${Math.abs(bal).toLocaleString()} ${bal > 0 ? '(Payable)' : bal < 0 ? '(Advance)' : ''}`
    : `Net Account Balance: Rs. ${Math.abs(bal).toLocaleString()} ${bal > 0 ? '(Receivable)' : bal < 0 ? '(Credit)' : ''}`;
  
  doc.text(balText, 190, 42, { align: 'right' });

  if (totals.totalDebit !== undefined && totals.totalCredit !== undefined) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const debitLabel = partyType === 'Supplier' ? 'Disbursed (Dr)' : 'Purchases (Dr)';
    const creditLabel = partyType === 'Supplier' ? 'Credits (Cr)' : 'Payments (Cr)';
    doc.text(`Total ${debitLabel}: Rs. ${totals.totalDebit.toLocaleString()}`, 190, 48, { align: 'right' });
    doc.text(`Total ${creditLabel}: Rs. ${totals.totalCredit.toLocaleString()}`, 190, 54, { align: 'right' });
  }

  // Format table rows
  const tableRows = ledgerEntries.map(entry => [
    entry.date || '',
    entry.description || entry.memo || 'Transaction Posting',
    entry.type || '-',
    entry.type === 'Debit' ? `Rs. ${(entry.amount || 0).toLocaleString()}` : '-',
    entry.type === 'Credit' ? `Rs. ${(entry.amount || 0).toLocaleString()}` : '-',
    `Rs. ${(entry.balanceAfter || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['Date', 'Transaction Reference / Description', 'Posting', 'Debit (Dr)', 'Credit (Cr)', 'Balance After']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 62 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 27, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      const str = `Page ${data.pageNumber} of ${pageCount}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 196, doc.internal.pageSize.height - 10, { align: 'right' });
      doc.text('Mandi Stock Brokerage System — Statement Ledger PDF', 14, doc.internal.pageSize.height - 10);
    }
  });

  const cleanName = (partyDetails?.name || partyType).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${partyType}_Ledger_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Generates and triggers download of a PDF document for Employee & Payroll Management reports.
 */
export const downloadPayrollReportPDF = ({
  reportTitle = 'Payroll Report',
  reportPeriod = '',
  reportData = [],
  businessProfile = {},
  totalAmount = null
}) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  const bizName = businessProfile?.businessName || 'Sabzi & Fruit Mandi Trade Brokerage';
  const owner = businessProfile?.ownerName ? `Proprietor: ${businessProfile.ownerName}` : '';
  const contact = [businessProfile?.mobileNumber, businessProfile?.whatsAppNumber].filter(Boolean).join(' / ');
  const address = [businessProfile?.address, businessProfile?.city, businessProfile?.country].filter(Boolean).join(', ');

  // Top Indigo Banner
  doc.setFillColor(79, 70, 229); // #4F46E5
  doc.rect(0, 0, 297, 26, 'F');

  // Business Name in White
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(bizName.toUpperCase(), 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const subtitle = `${reportTitle.toUpperCase()} ${reportPeriod ? `• PERIOD: ${reportPeriod.toUpperCase()}` : ''}`;
  doc.text(subtitle, 14, 19);

  // Date on Header Right
  const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.setFontSize(8);
  doc.text(`Date: ${formattedDate}`, 283, 12, { align: 'right' });
  doc.text(`Code: ${businessProfile?.businessCode || 'BIZ-DEFAULT'}`, 283, 18, { align: 'right' });

  // Business Meta Sub-bar
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 30, 269, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 30, 269, 16, 2, 2, 'D');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  if (owner) doc.text(owner, 18, 37);
  if (address) doc.text(`Address: ${address}`, 18, 42);
  if (contact) doc.text(`Contact: ${contact}`, 140, 37);

  if (totalAmount !== null && totalAmount !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(`Total Sum: Rs. ${Number(totalAmount).toLocaleString()}`, 279, 40, { align: 'right' });
  }

  if (!reportData || reportData.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No records found for the selected report filters.', 14, 58);
    doc.save(`${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    return;
  }

  // Extract Columns & Rows from reportData
  const headers = Object.keys(reportData[0]);
  const body = reportData.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '-';
      if (typeof val === 'number') {
        if (h.includes('(Rs.)') || h.includes('Basic') || h.includes('Payout') || h.includes('Amount')) {
          return `Rs. ${val.toLocaleString()}`;
        }
      }
      return String(val);
    })
  );

  autoTable(doc, {
    startY: 50,
    head: [headers],
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, 283, doc.internal.pageSize.height - 8, { align: 'right' });
      doc.text(`Official Computer Generated Audit Report • ${bizName}`, 14, doc.internal.pageSize.height - 8);
    }
  });

  const filename = `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Generates and triggers download of a PDF document for Day-Wise Purchase Report.
 */
export const downloadDayWisePurchasePDF = ({
  customerDetails = {},
  dayWiseList = [],
  totals = {},
  filterTitle = 'All Time'
}) => {
  const doc = new jsPDF();

  // Top Banner
  doc.setFillColor(79, 70, 229); // #4F46E5
  doc.rect(0, 0, 210, 28, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LAHORE SABZI & FRUIT MANDI BROKERAGE', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`DAY-WISE PURCHASE REPORT (${filterTitle.toUpperCase()})`, 14, 20);

  // Date on Header Right
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 196, 20, { align: 'right' });

  // Customer Information & Summary Card
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 34, 182, 30, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 34, 182, 30, 3, 3, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Customer: ${customerDetails?.name || 'Customer Account'}`, 18, 42);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Phone: ${customerDetails?.phone || 'N/A'}`, 18, 48);
  doc.text(`City: ${customerDetails?.city || 'Mandi Market'}`, 18, 54);

  const totalAmount = totals.grandTotalAmount || dayWiseList.reduce((acc, d) => acc + (d.totalAmount || 0), 0);
  const totalQty = totals.grandTotalQty || dayWiseList.reduce((acc, d) => acc + (d.totalQuantity || 0), 0);
  const totalDays = totals.grandTotalDays || dayWiseList.length;

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Days Logged: ${totalDays}`, 190, 42, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Total Quantity: ${totalQty.toLocaleString()} Units`, 190, 48, { align: 'right' });
  doc.text(`Total Net Amount: Rs. ${totalAmount.toLocaleString()}`, 190, 54, { align: 'right' });

  // Format table rows
  const tableRows = dayWiseList.map((dayData, idx) => [
    idx + 1,
    dayData.date || 'N/A',
    `${dayData.itemsCount || 0} Line(s)`,
    `${(dayData.totalQuantity || 0).toLocaleString()} Units`,
    `Rs. ${(dayData.totalCommission || 0).toLocaleString()}`,
    `Rs. ${(dayData.totalAmount || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['S.No', 'Purchase Date', 'Items Purchased', 'Total Quantity', 'Commission', 'Day Total Invoice']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      const str = `Page ${data.pageNumber} of ${pageCount}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 196, doc.internal.pageSize.height - 10, { align: 'right' });
      doc.text('Mandi Stock Brokerage System — Day Wise Purchase Report', 14, doc.internal.pageSize.height - 10);
    }
  });

  const cleanName = (customerDetails?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `DayWise_Purchase_Report_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Generates and triggers download of a PDF document for a Single Day's Purchase Breakdown.
 */
export const downloadSingleDayPurchasePDF = ({
  customerDetails = {},
  dayData = {}
}) => {
  const doc = new jsPDF();

  // Top Banner
  doc.setFillColor(79, 70, 229); // #4F46E5
  doc.rect(0, 0, 210, 28, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LAHORE SABZI & FRUIT MANDI BROKERAGE', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`DAILY PURCHASE BREAKDOWN — ${dayData.date || ''}`, 14, 20);

  // Date on Header Right
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 196, 20, { align: 'right' });

  // Customer Information & Summary Card
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 34, 182, 30, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 34, 182, 30, 3, 3, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Customer: ${customerDetails?.name || 'Customer Account'}`, 18, 42);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Phone: ${customerDetails?.phone || 'N/A'}`, 18, 48);
  doc.text(`City: ${customerDetails?.city || 'Mandi Market'}`, 18, 54);

  doc.setFont('helvetica', 'bold');
  doc.text(`Purchase Date: ${dayData.date || 'N/A'}`, 190, 42, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Total Items: ${dayData.itemsCount || (dayData.items || []).length} Produce Lines`, 190, 48, { align: 'right' });
  doc.text(`Day Net Amount: Rs. ${(dayData.totalAmount || 0).toLocaleString()}`, 190, 54, { align: 'right' });

  // Format table rows
  const tableRows = (dayData.items || []).map((item, idx) => [
    idx + 1,
    item.productName || 'Produce',
    item.lotNumber ? `Lot #${item.lotNumber}` : '-',
    item.quantity || 0,
    `Rs. ${(item.saleRate || 0).toLocaleString()}`,
    `Rs. ${(item.commissionAmount || 0).toLocaleString()}`,
    `Rs. ${(item.discount || 0).toLocaleString()}`,
    `Rs. ${(item.totalAmount || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['#', 'Product / Produce', 'Lot #', 'Qty', 'Unit Rate', 'Commission', 'Discount', 'Line Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      const str = `Page ${data.pageNumber} of ${pageCount}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 196, doc.internal.pageSize.height - 10, { align: 'right' });
      doc.text(`Day Purchases Log — ${dayData.date || ''}`, 14, doc.internal.pageSize.height - 10);
    }
  });

  const cleanName = (customerDetails?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `DayPurchase_${dayData.date}_${cleanName}.pdf`;
  doc.save(filename);
};

/**
 * Generates and triggers download of a PDF document for a Professional Lot Voucher.
 */
export const downloadLotVoucherPDF = ({
  lot = {},
  lotSales = [],
  lotReturns = [],
  supplier = {},
  stock = {}
}) => {
  const doc = new jsPDF();
  const activeStock = stock.id ? stock : (lot.stock || {});
  const lotNum = lot.lotNumber || activeStock.lotNumber || 'N/A';
  const productName = lot.productName || activeStock.productName || 'General Produce';
  const supplierName = supplier.name || lot.supplier?.name || activeStock.supplierName || 'N/A';
  const supplierPhone = supplier.phone || lot.supplier?.phone || 'N/A';
  const arrivalDate = activeStock.date || activeStock.arrivalDate || lot.arrivalDate || 'N/A';

  // Header Banner Background
  doc.setFillColor(79, 70, 229); // #4F46E5
  doc.rect(0, 0, 210, 28, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LAHORE SABZI & FRUIT MANDI BROKERAGE', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`PROFESSIONAL CONSIGNMENT LOT VOUCHER — LOT #${lotNum}`, 14, 20);

  // Date on Header Right
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 196, 20, { align: 'right' });

  // Lot Info Panel
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 34, 182, 32, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 34, 182, 32, 3, 3, 'D');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Supplier Name: ${supplierName}`, 18, 42);
  doc.text(`Commodity: ${productName}`, 18, 48);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Phone: ${supplierPhone}`, 18, 54);
  doc.text(`Arrival Date: ${arrivalDate}`, 18, 60);

  const arrivedQty = activeStock.quantity || lot.arrivedQty || 0;
  const rawSoldQty = lotSales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const returnedQty = lotReturns.reduce((sum, r) => sum + (Number(r.produceReturnedQty) || 0), 0);
  const soldQty = Math.max(0, rawSoldQty - returnedQty);
  const remainingQty = activeStock.remainingQuantity !== undefined ? activeStock.remainingQuantity : Math.max(0, arrivedQty - soldQty);

  doc.setFont('helvetica', 'bold');
  doc.text(`Lot Number: #${lotNum}`, 190, 42, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Initial Arrived Qty: ${arrivedQty} units`, 190, 48, { align: 'right' });
  doc.text(`Net Sold Qty: ${soldQty} units${returnedQty > 0 ? ` (${returnedQty} ret)` : ''}`, 190, 54, { align: 'right' });
  doc.text(`Remaining Stock: ${remainingQty} units`, 190, 60, { align: 'right' });

  // Format sales table
  let rawGrossSum = 0;
  let lotCommSum = 0;
  let lotDiscSum = 0;
  let lotNetSum = 0;

  const tableRows = lotSales.map((s) => {
    const qty = s.quantity || 0;
    const invNum = s.invoiceNumber || (s.id || s._id || '').substring(0, 8).toUpperCase();
    const gross = s.grossSale || (qty * (s.saleRate || 0)) || 0;
    const comm = s.commissionAmount || s.commission || 0;
    const disc = s.discount || 0;
    const net = s.netSale || s.totalAmount || (gross - comm - disc);

    rawGrossSum += gross;
    lotCommSum += comm;
    lotDiscSum += disc;
    lotNetSum += net;

    return [
      `INV-${invNum}`,
      s.date || 'N/A',
      s.customerName || s.walkInName || 'Walk-In',
      s.isWalkIn ? 'Walk-In' : 'Registered',
      qty,
      `Rs. ${(s.saleRate || 0).toLocaleString()}`,
      `Rs. ${gross.toLocaleString()}`,
      `Rs. ${comm.toLocaleString()}`,
      `Rs. ${net.toLocaleString()}`
    ];
  });

  // Append return rows if any exist
  const returnedGrossValue = lotReturns.reduce((sum, r) => sum + (Number(r.grossReturnAmount) || (Number(r.produceReturnedQty || 0) * Number(r.saleRate || 0))), 0);
  lotReturns.forEach(r => {
    const rQty = Number(r.produceReturnedQty) || 0;
    const rGross = Number(r.grossReturnAmount) || (rQty * Number(r.saleRate || 0));
    tableRows.push([
      r.returnNumber || 'RET',
      r.date || 'N/A',
      r.customerName || 'Customer Return',
      'Return',
      `-${rQty}`,
      `Rs. ${(r.saleRate || 0).toLocaleString()}`,
      `-Rs. ${rGross.toLocaleString()}`,
      '-',
      `-Rs. ${rGross.toLocaleString()}`
    ]);
  });

  const lotGrossSum = Math.max(0, Math.round((rawGrossSum - returnedGrossValue) * 100) / 100);

  autoTable(doc, {
    startY: 72,
    head: [['Invoice #', 'Date', 'Buyer Name', 'Buyer Type', 'Qty', 'Rate', 'Gross Value', 'Comm.', 'Net Value']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 12, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 120;

  // Compute deductions for Settlement Card
  const commType = activeStock.supplierCommissionType || 'Percentage';
  const commVal = activeStock.supplierCommissionValue !== undefined ? activeStock.supplierCommissionValue : 0;
  let suppCommAmt = 0;
  if (commType === 'Percentage') suppCommAmt = lotGrossSum * (commVal / 100);
  else if (commType === 'Per Unit') suppCommAmt = soldQty * commVal;
  else if (commType === 'Fixed Amount') suppCommAmt = commVal;

  const marketFeeRate = Number(activeStock.marketFeeRate || activeStock.marketFeePercentage || 0);
  let marketFeeAmt = 0;
  if (activeStock.marketFeeAmount) {
    marketFeeAmt = Number(activeStock.marketFeeAmount);
  } else if (marketFeeRate > 0) {
    marketFeeAmt = Math.round((lotGrossSum * (marketFeeRate / 100)) * 100) / 100;
  }

  let totalExpAmt = 0;
  const expObj = activeStock.lotExpenses || {};
  Object.values(expObj).forEach(v => {
    const n = Number(v);
    if (!isNaN(n) && n > 0) totalExpAmt += n;
  });

  const totalDeductions = Math.round((suppCommAmt + marketFeeAmt + totalExpAmt) * 100) / 100;
  const netPayableToSupplier = Math.round((lotGrossSum - totalDeductions) * 100) / 100;

  if (finalY + 55 > doc.internal.pageSize.height) {
    doc.addPage();
    finalY = 20;
  }

  // Settlement Box
  const boxHeight = marketFeeAmt > 0 ? 44 : 38;
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, finalY, 182, boxHeight, 3, 3, 'F');
  doc.setDrawColor(99, 102, 241);
  doc.roundedRect(14, finalY, 182, boxHeight, 3, 3, 'D');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text('SUPPLIER SETTLEMENT & DEDUCTIONS BREAKDOWN', 18, finalY + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text('Gross Consignment Sales Value:', 18, finalY + 14);
  doc.text(`Rs. ${lotGrossSum.toLocaleString()}`, 190, finalY + 14, { align: 'right' });

  doc.text(`Supplier Commission (${commVal} ${commType}):`, 18, finalY + 19);
  doc.setTextColor(220, 38, 38);
  doc.text(`- Rs. ${Math.round(suppCommAmt).toLocaleString()}`, 190, finalY + 19, { align: 'right' });

  let curY = finalY + 19;
  if (marketFeeAmt > 0) {
    curY += 5;
    doc.setTextColor(30, 41, 59);
    doc.text(`Market / Sarkari Fee (${marketFeeRate}%):`, 18, curY);
    doc.setTextColor(220, 38, 38);
    doc.text(`- Rs. ${Math.round(marketFeeAmt).toLocaleString()}`, 190, curY, { align: 'right' });
  }

  if (totalExpAmt > 0) {
    curY += 5;
    doc.setTextColor(30, 41, 59);
    doc.text('Lot Expense Deductions:', 18, curY);
    doc.setTextColor(220, 38, 38);
    doc.text(`- Rs. ${totalExpAmt.toLocaleString()}`, 190, curY, { align: 'right' });
  }

  curY += 6;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 27, 75);
  doc.text('NET PAYABLE TO SUPPLIER:', 18, curY);
  doc.setTextColor(5, 150, 105);
  doc.text(`Rs. ${netPayableToSupplier.toLocaleString()}`, 190, curY, { align: 'right' });

  // Signatures
  const sigY = finalY + 52;
  if (sigY + 20 < doc.internal.pageSize.height) {
    doc.setDrawColor(148, 163, 184);
    doc.line(20, sigY, 70, sigY);
    doc.line(140, sigY, 190, sigY);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Mandi Clerk Verification', 45, sigY + 5, { align: 'center' });
    doc.text('Authorized Manager Stamp', 165, sigY + 5, { align: 'center' });
  }

  const filename = `Professional_Lot_Voucher_Lot_${lotNum}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

