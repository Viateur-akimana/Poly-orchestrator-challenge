import jsPDF from 'jspdf';
import { TransferOrderDto } from '@/services/transfer.service';

export const generateTransferReceipt = (transfer: TransferOrderDto) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colors - Premium Professional Palette
  const brandPrimary = [15, 23, 42]; // Slate 900 (Deep Navy)
  const brandAccent = [16, 185, 129]; // Emerald 500 (Success Green)
  const brandSecondary = [71, 85, 105]; // Slate 600 (Text Gray)
  const lightGray = [241, 245, 249]; // Slate 100 (Backgrounds)
  const borderGray = [226, 232, 240]; // Slate 200 (Lines)

  // 1. HEADER & BRANDING
  // Background Header
  doc.setFillColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.rect(0, 0, 210, 45, 'F');

  // Decorative Accent Circle (Abstract Logo Mark)
  doc.setFillColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.circle(25, 22, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('S', 25, 24, { align: 'center' });

  // Brand Name
  doc.setFontSize(22);
  doc.text('SKYLINE', 38, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255, 0.8);
  doc.text('TRANSFERS & PAYMENTS', 38, 28);

  // Receipt Identifier
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL TRANSACTION RECEIPT', 190, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Ref: ${transfer.reference}`, 190, 24, { align: 'right' });
  doc.text(`Issued: ${new Date().toLocaleDateString()}`, 190, 28, { align: 'right' });

  // 2. STATUS WATERMARK (For Completed Transfers)
  if (transfer.status?.toUpperCase() === 'COMPLETED') {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.05 }));
    doc.setFontSize(60);
    doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
    doc.text('SUCCESSFULLY VERIFIED', 105, 150, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  // 3. MAIN CONTENT
  let currentY = 60;

  // Transaction Overview Header
  doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Overview', 20, currentY);
  
  doc.setDrawColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.setLineWidth(1);
  doc.line(20, currentY + 3, 40, currentY + 3);

  currentY += 15;

  // Two-Column Layout for Sender & Recipient
  // Column 1: SENDER
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(20, currentY, 82, 45, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(brandSecondary[0], brandSecondary[1], brandSecondary[2]);
  doc.text('SENDER DETAILS', 25, currentY + 8);
  
  doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(transfer.senderName || 'Anonymous User', 25, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(transfer.senderPhone || 'Phone hidden', 25, currentY + 24);
  doc.setTextColor(brandSecondary[0], brandSecondary[1], brandSecondary[2]);
  doc.text('Source Account: RU Card/SB', 25, currentY + 34);

  // Column 2: RECIPIENT
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(108, currentY, 82, 45, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(brandSecondary[0], brandSecondary[1], brandSecondary[2]);
  doc.text('RECIPIENT DETAILS', 113, currentY + 8);
  
  doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(transfer.recipientName, 113, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(transfer.recipientPhone, 113, currentY + 24);
  doc.setTextColor(brandSecondary[0], brandSecondary[1], brandSecondary[2]);
  doc.text(`Delivery: ${transfer.deliveryMethod?.replace('_', ' ').toUpperCase() || 'MOBILE MONEY'}`, 113, currentY + 34);

  currentY += 60;

  // 4. TRANSACTION TIMELINE & STATUS
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.text('Processing Status', 20, currentY);
  
  currentY += 8;
  const statusColor = transfer.status?.toUpperCase() === 'COMPLETED' ? brandAccent : [217, 119, 6];
  doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.circle(23, currentY + 2, 1.5, 'FD');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(transfer.status?.replace('_', ' ').toUpperCase() || 'PENDING', 28, currentY + 3.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(brandSecondary[0], brandSecondary[1], brandSecondary[2]);
  doc.setFontSize(8);
  doc.text(`Initialized: ${new Date(transfer.createdAt).toLocaleString()}`, 190, currentY + 3, { align: 'right' });

  currentY += 15;

  // 5. FINANCIAL BREAKDOWN TABLE
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.2);
  doc.line(20, currentY, 190, currentY);
  
  currentY += 10;
  
  const sendCurrency = transfer.fromCurrency?.code || (transfer.direction === 'RU_TO_RW' ? 'RUB' : 'RWF');
  const receiveCurrency = transfer.toCurrency?.code || (transfer.direction === 'RU_TO_RW' ? 'RWF' : 'RUB');

  const financials = [
    ['Principal Transfer Amount', `${Number(transfer.sendAmount).toLocaleString()} ${sendCurrency}`],
    ['Processing Service Fee', `${Number(transfer.fee || 0).toLocaleString()} ${sendCurrency}`],
    ['Network & Payout Costs', `Invoiced/Included`],
    ['Applied Exchange Rate', `1 ${sendCurrency} = ${Number(transfer.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${receiveCurrency}`],
  ];

  financials.forEach((item, i) => {
    doc.setTextColor(brandSecondary[0], brandSecondary[1], brandSecondary[2]);
    doc.setFontSize(10);
    doc.text(item[0], 25, currentY + (i * 10));
    doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], 185, currentY + (i * 10), { align: 'right' });
    doc.setFont('helvetica', 'normal');
  });

  currentY += (financials.length * 10) + 5;

  // TOTAL PAYOUT BOX
  doc.setFillColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.roundedRect(20, currentY, 170, 25, 1, 1, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('TOTAL RECIPIENT CREDIT', 30, currentY + 15);
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.text(`${Number(transfer.receiveAmount).toLocaleString()} ${receiveCurrency}`, 180, currentY + 16, { align: 'right' });

  // 6. COMPLIANCE & FOOTER
  const footerY = 265;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(20, footerY - 10, 190, footerY - 10);

  doc.setTextColor(brandSecondary[0], brandSecondary[1], brandSecondary[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Terms & Conditions:', 20, footerY);
  doc.text('1. All transactions are subject to AML/KYC verification. 2. Payouts are instant once confirmation is received.', 20, footerY + 5);
  doc.text('3. This document is a digitally issued receipt and is valid without a physical signature.', 20, footerY + 9);

  // Digital Signature Placeholder
  doc.saveGraphicsState();
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.text('Skyline Transfers Digital Authentication Core', 190, footerY + 10, { align: 'right' });
  doc.restoreGraphicsState();

  doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('SKYLINE TRANSFERS', 105, 285, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Support & Inquiries: operations@skylinetransfers.com | Skyline Transfers Digital Platform', 105, 290, { align: 'center' });

  // Save the PDF
  doc.save(`SKYLINE-RECEIPT-${transfer.reference}.pdf`);
};
