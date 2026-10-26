import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Institutional certificate layout.
 *
 * The layout follows CITAD's printed certificate: a blue double frame with
 * corner brackets, CITAD and CPN marks in the header, a large CITAD watermark,
 * the recipient name on a rule, a highlighted activity line, signature areas,
 * and a small verification QR. Template wording, colours, border settings and
 * signatures are still honoured so custom templates keep working.
 */

const ASSET_ROOT = fileURLToPath(
  new URL('../../assets/certificates/', import.meta.url)
);
const FONT_ROOT = fileURLToPath(new URL('../../assets/fonts/', import.meta.url));

const CITAD_LOGO = path.join(ASSET_ROOT, 'citad-logo.png');
const CPN_LOGO = path.join(ASSET_ROOT, 'cpn-logo.png');
const GREAT_VIBES = path.join(FONT_ROOT, 'GreatVibes-Regular.ttf');

const COLORS = {
  blue: '#0E4F8B',
  blueDeep: '#0A3C6B',
  blueSoft: '#D9EAF7',
  blueLine: '#4A90C2',
  bluePale: '#EAF4FB',
  text: '#1F2937',
  muted: '#486581',
  gold: '#C9A227',
  sealRed: '#C0392B',
};

const CPN_REGISTRATION = 'CPN/RRCLP/12/02/2016/00039';
// Current contact-page address; preserve the sample's layout, not its older address.
// Source: https://citad.org.ng/contact/ (checked 26 October 2026).
const CITAD_ADDRESS = [
  'Head Office: Plot 4 Samaila Adamu Gano Street, Gandu Layout, adjacent NSITF building,',
  'Social Insurance Road, Trade Fair Complex, Zaria Road, Kano State, Nigeria.',
];
const CITAD_CONTACT = 'www.citad.org.ng     email: info@citad.org';

const clamp = (value, min, max, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ordinal = (day) => {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th';
  return `${day}${suffix}`;
};

const lagosParts = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).formatToParts(date);
  return {
    year: parts.find((part) => part.type === 'year')?.value || '',
    month: parts.find((part) => part.type === 'month')?.value || '',
    day: Number(parts.find((part) => part.type === 'day')?.value || 0),
  };
};

/**
 * Format an event date, or a multi-day range, in the style used on CITAD
 * certificates: "October 24, 2026" or "October 24th – 26th, 2026".
 */
export function formatEventDateRange(start, end = start) {
  const from = lagosParts(start);
  if (!from) return '';
  const to = lagosParts(end) || from;

  if (from.year === to.year && from.month === to.month && from.day === to.day) {
    return `${from.month} ${from.day}, ${from.year}`;
  }

  if (from.year === to.year && from.month === to.month) {
    return `${from.month} ${ordinal(from.day)} - ${ordinal(to.day)}, ${from.year}`;
  }

  if (from.year === to.year) {
    return `${from.month} ${ordinal(from.day)} - ${to.month} ${ordinal(to.day)}, ${from.year}`;
  }

  return `${from.month} ${ordinal(from.day)}, ${from.year} - ${to.month} ${ordinal(to.day)}, ${to.year}`;
}

/**
 * Remove the recipient name and any "This is to certify that" lead-in from a
 * template body, because the name is printed separately above the statement.
 */
export function cleanCertificateStatement(body, recipientName = '') {
  let text = String(body || '').replace(/\s+/g, ' ').trim();

  if (recipientName) {
    text = text.replace(new RegExp(escapeRegExp(recipientName), 'gi'), ' ');
  }
  text = text.replace(/\{\{\s*recipientName\s*\}\}/gi, ' ');

  text = text
    .replace(/^this\s+is\s+to\s+certify\s+that\s*/i, '')
    .replace(/^that\s+/i, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function fitSingleLine(doc, text, font, preferredSize, maxWidth, minSize) {
  let size = preferredSize;
  doc.font(font);
  while (size > minSize) {
    doc.fontSize(size);
    if (doc.widthOfString(text) <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function drawCornerBracket(doc, x, y, sx, sy, length, color, accent) {
  doc.save();
  doc.lineWidth(4.2).strokeColor(color);
  doc
    .moveTo(x + sx * length, y)
    .lineTo(x, y)
    .lineTo(x, y + sy * length)
    .stroke();

  doc.lineWidth(0.8).strokeColor(accent);
  doc
    .moveTo(x + sx * (length - 9), y + sy * 7)
    .lineTo(x + sx * 7, y + sy * 7)
    .lineTo(x + sx * 7, y + sy * (length - 9))
    .stroke();
  doc.restore();
}

function drawInstitutionalSeal(doc, centerX, centerY) {
  doc.save();
  doc.fillOpacity(0.14);
  const rays = 20;
  const outer = 52;
  const inner = 20;
  for (let index = 0; index < rays; index += 1) {
    const start = (Math.PI * 2 * index) / rays - Math.PI / 2;
    const end = (Math.PI * 2 * (index + 1)) / rays - Math.PI / 2;
    doc
      .moveTo(centerX, centerY)
      .lineTo(centerX + Math.cos(start) * outer, centerY + Math.sin(start) * outer)
      .lineTo(centerX + Math.cos(end) * outer, centerY + Math.sin(end) * outer)
      .closePath()
      .fill(index % 2 === 0 ? COLORS.gold : '#E3C76A');
  }
  doc.fillOpacity(0.18);
  doc.circle(centerX, centerY, inner).fill(COLORS.sealRed);
  doc.fillOpacity(0.24);
  doc.circle(centerX, centerY, inner + 4).lineWidth(1).stroke(COLORS.gold);
  doc.restore();
}

export function signatureSlots(signatures) {
  const list =
    Array.isArray(signatures) && signatures.length
      ? signatures
      : [
          { title: 'Training Facilitator, CITAD', position: 'left' },
          { title: 'Executive Director, CITAD', position: 'right' },
        ];

  const fallbackPositions =
    list.length === 1
      ? ['center']
      : list.length === 2
        ? ['left', 'right']
        : ['left', 'center', 'right'];

  return list.slice(0, 3).map((signature, index) => {
    const plain =
      typeof signature?.toObject === 'function'
        ? signature.toObject()
        : signature || {};
    return {
      ...plain,
      slot: plain.position || fallbackPositions[index] || 'center',
    };
  });
}

/**
 * Draw the full certificate on an existing PDFKit document.
 */
export function renderInstitutionalCertificate(
  doc,
  certificate,
  template,
  data,
  qrDataURL
) {
  const width = doc.page.width;
  const height = doc.page.height;
  const design = template?.design || {};
  const border = design.border || {};
  const fonts = design.fonts || {};
  const content = template?.renderContent
    ? template.renderContent(data)
    : {
        title: template?.content?.title || 'Certificate of Attendance',
        body: template?.content?.bodyText || '',
        footer: template?.content?.footerText || '',
      };

  const frameColor = border.color || COLORS.blue;
  const hasScriptFont = existsSync(GREAT_VIBES);
  if (hasScriptFont) doc.registerFont('CITAD-Script', GREAT_VIBES);
  const scriptFont = hasScriptFont ? 'CITAD-Script' : 'Times-Italic';

  // Paper tint and frame ----------------------------------------------------
  doc.rect(0, 0, width, height).fill(design.backgroundColor || '#FFFFFF');

  if (border.enabled !== false) {
    doc
      .lineWidth(0.7)
      .strokeColor(COLORS.blueSoft)
      .rect(16, 16, width - 32, height - 32)
      .stroke();
    doc
      .lineWidth(clamp(border.width, 0.8, 4, 1.6))
      .strokeColor(frameColor)
      .rect(30, 30, width - 60, height - 60)
      .stroke();
    doc
      .lineWidth(0.35)
      .strokeColor(COLORS.blueSoft)
      .rect(36, 36, width - 72, height - 72)
      .stroke();

    drawCornerBracket(doc, 30, 30, 1, 1, 50, frameColor, COLORS.blueSoft);
    drawCornerBracket(doc, width - 30, 30, -1, 1, 50, frameColor, COLORS.blueSoft);
    drawCornerBracket(doc, 30, height - 30, 1, -1, 50, frameColor, COLORS.blueSoft);
    drawCornerBracket(
      doc,
      width - 30,
      height - 30,
      -1,
      -1,
      50,
      frameColor,
      COLORS.blueSoft
    );
  }

  // Header -----------------------------------------------------------------
  const logoY = 45;
  if (existsSync(CITAD_LOGO)) {
    doc.image(CITAD_LOGO, 55, logoY, {
      fit: [132, 62],
      align: 'left',
      valign: 'top',
    });
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(14.5)
    .fillColor(COLORS.blue)
    .text('CENTRE FOR INFORMATION TECHNOLOGY', 190, 44, {
      width: width - 380,
      align: 'center',
      characterSpacing: 0.4,
    })
    .text('AND DEVELOPMENT (CITAD)', 190, 62, {
      width: width - 380,
      align: 'center',
      characterSpacing: 0.4,
    });

  doc
    .font('Helvetica')
    .fontSize(7.4)
    .fillColor(COLORS.muted)
    .text(CITAD_ADDRESS[0], 178, 82, {
      width: width - 356,
      align: 'center',
    })
    .text(CITAD_ADDRESS[1], 178, 92, {
      width: width - 356,
      align: 'center',
    })
    .fontSize(7.2)
    .fillColor(COLORS.blue)
    .text(CITAD_CONTACT, 178, 104, {
      width: width - 356,
      align: 'center',
    });

  if (existsSync(CPN_LOGO)) {
    doc.image(CPN_LOGO, width - 104, 42, {
      fit: [48, 64],
      align: 'center',
      valign: 'top',
    });
  }
  doc
    .font('Helvetica')
    .fontSize(5.4)
    .fillColor(COLORS.muted)
    .text(CPN_REGISTRATION, width - 160, 110, {
      width: 112,
      align: 'center',
    });

  const issuedYear = new Date(certificate.issuedDate || Date.now()).getFullYear();
  doc
    .font('Helvetica')
    .fontSize(6.8)
    .fillColor(COLORS.muted)
    .text(`CITAD/DATA/${issuedYear}`, 55, 112, { width: 132, align: 'left' });

  // Thin rule with a small centre diamond.
  doc
    .moveTo(52, 128)
    .lineTo(width - 52, 128)
    .lineWidth(0.6)
    .strokeColor(COLORS.blueSoft)
    .stroke();
  doc
    .save()
    .translate(width / 2, 128)
    .rotate(45)
    .rect(-3, -3, 6, 6)
    .fill(COLORS.gold)
    .restore();

  // Watermark --------------------------------------------------------------
  doc
    .save()
    .font('Helvetica-Bold')
    .fontSize(146)
    .fillColor(COLORS.bluePale)
    .fillOpacity(0.9)
    .text('CITAD', 0, 142, { width, align: 'center', lineBreak: false })
    .restore();

  // Title ------------------------------------------------------------------
  const title = content.title || 'Certificate of Attendance';
  const headingSize = fitSingleLine(
    doc,
    title,
    'Times-Bold',
    clamp(fonts.heading?.size, 28, 40, 34),
    width - 260,
    24
  );
  doc
    .font('Times-Bold')
    .fontSize(headingSize)
    .fillColor(fonts.heading?.color || COLORS.blue)
    .text(title, 130, 166, {
      width: width - 260,
      align: 'center',
      characterSpacing: 0.7,
    });

  doc
    .font(scriptFont)
    .fontSize(21)
    .fillColor(COLORS.muted)
    .text('This is to certify that', 150, 221, {
      width: width - 300,
      align: 'center',
    });

  // Recipient --------------------------------------------------------------
  const recipientName = data.recipientName || certificate.recipientName || '';
  const recipientSize = fitSingleLine(
    doc,
    recipientName,
    scriptFont,
    clamp(fonts.recipient?.size, 30, 46, 40),
    width - 210,
    22
  );
  doc
    .font(scriptFont)
    .fontSize(recipientSize)
    .fillColor(fonts.recipient?.color || COLORS.text)
    .text(recipientName, 80, 250, {
      width: width - 160,
      align: 'center',
      lineBreak: false,
    });

  doc
    .moveTo(150, 305)
    .lineTo(width - 150, 305)
    .lineWidth(0.9)
    .strokeColor('#7FA7C9')
    .stroke();

  // Activity statement -----------------------------------------------------
  const statement =
    cleanCertificateStatement(content.body, recipientName) ||
    `Has attended ${data.eventTitle || 'this event'}.`;
  const statementFont = 'Times-Bold';
  doc.font(statementFont);
  let statementSize = clamp(fonts.body?.size, 11, 16, 14) + 1;
  const statementTextLimit = 700;
  while (
    statementSize > 12.5 &&
    doc.fontSize(statementSize).widthOfString(statement) > statementTextLimit
  ) {
    statementSize -= 0.5;
  }

  const statementTextWidth = Math.min(
    doc.fontSize(statementSize).widthOfString(statement) + 80,
    740
  );
  const statementHeight = doc.heightOfString(statement, {
    width: statementTextWidth - 40,
    align: 'center',
  });
  const statementY = 326;
  const statementX = (width - statementTextWidth) / 2;

  doc
    .roundedRect(
      statementX,
      statementY - 6,
      statementTextWidth,
      statementHeight + 12,
      3
    )
    .fill(COLORS.bluePale);
  doc
    .font(statementFont)
    .fontSize(statementSize)
    .fillColor(fonts.body?.color || COLORS.text)
    .text(statement, statementX + 20, statementY, {
      width: statementTextWidth - 40,
      align: 'center',
    });

  const dateLabel = data.eventDateRange || data.eventDate || '';
  if (dateLabel) {
    doc
      .font('Times-Roman')
      .fontSize(12)
      .fillColor(COLORS.muted)
      .text(`Date: ${dateLabel}`, 130, statementY + statementHeight + 16, {
        width: width - 260,
        align: 'center',
      });
  }

  // Signatures -------------------------------------------------------------
  drawInstitutionalSeal(doc, width / 2, 491);

  const anchors = { left: 202, center: width / 2, right: 640 };
  const lineY = 452;
  const lineWidth = 196;

  signatureSlots(template?.signatures).forEach((signature) => {
    const centerX = anchors[signature.slot] || anchors.center;
    const x = centerX - lineWidth / 2;

    if (signature.imageUrl && existsSync(signature.imageUrl)) {
      doc.image(signature.imageUrl, x + 30, lineY - 34, {
        fit: [lineWidth - 60, 30],
        align: 'center',
        valign: 'bottom',
      });
    }

    doc
      .moveTo(x, lineY)
      .lineTo(x + lineWidth, lineY)
      .lineWidth(0.8)
      .strokeColor('#4B6B88')
      .stroke();

    let textY = lineY + 8;
    if (signature.name) {
      doc
        .font('Times-Bold')
        .fontSize(9.5)
        .fillColor(COLORS.blueDeep)
        .text(signature.name, x, textY, {
          width: lineWidth,
          align: 'center',
        });
      textY += 13;
    }
    if (signature.title) {
      doc
        .font('Helvetica')
        .fontSize(7.2)
        .fillColor(COLORS.muted)
        .text(signature.title, x, textY, {
          width: lineWidth,
          align: 'center',
        });
    }
  });

  // Verification and footer ------------------------------------------------
  if (qrDataURL) {
    const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');
    const qrSize = 46;
    const qrX = width - 88;
    const qrY = height - 92;
    doc
      .roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 2)
      .fill('#FFFFFF');
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc
      .font('Helvetica')
      .fontSize(5.4)
      .fillColor(COLORS.muted)
      .text('Scan to verify', qrX - 16, qrY + qrSize + 3, {
        width: qrSize + 32,
        align: 'center',
      });
  }

  const verificationBase =
    process.env.FRONTEND_URL || 'https://meetcitad.org';
  doc
    .font('Helvetica-Bold')
    .fontSize(6.8)
    .fillColor(COLORS.blueDeep)
    .text(`Certificate No: ${certificate.certificateNumber || ''}`, 55, height - 60, {
      width: 390,
    });
  doc
    .font('Helvetica')
    .fontSize(6.2)
    .fillColor(COLORS.muted)
    .text(`Verify: ${verificationBase.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/verify`, 55, height - 50, {
      width: 390,
    });

  const footerText =
    content.footer ||
    (template?.content?.footerText || '').trim() ||
    'Centre for Information Technology and Development (CITAD), Kano, Nigeria';
  doc
    .font('Helvetica')
    .fontSize(6.3)
    .fillColor(COLORS.muted)
    .text(footerText, 245, height - 38, {
      width: width - 490,
      align: 'center',
    });
}

/**
 * Draw a certificate using an already-designed image as the full-page
 * background. This is used when an administrator uploads a finished CITAD
 * certificate and only the recipient-specific details need to be overlaid.
 */
export function renderUploadedCertificate(
  doc,
  certificate,
  template,
  data,
  qrDataURL,
  backgroundImage
) {
  const width = doc.page.width;
  const height = doc.page.height;
  const design = template?.design || {};
  const fonts = design.fonts || {};
  const layout = design.layout || {};
  const mm = (value, fallback) => {
    const numeric = Number(value);
    return (Number.isFinite(numeric) ? numeric : fallback) * (72 / 25.4);
  };

  // Cover the page without stretching a design that is not exactly A4.
  const background = doc.openImage(backgroundImage);
  const scale = Math.max(width / background.width, height / background.height);
  const drawWidth = background.width * scale;
  const drawHeight = background.height * scale;

  doc.save();
  doc.rect(0, 0, width, height).clip();
  doc.image(background, (width - drawWidth) / 2, (height - drawHeight) / 2, {
    width: drawWidth,
    height: drawHeight,
  });
  doc.restore();

  const content = template?.renderContent
    ? template.renderContent(data)
    : {
        title: template?.content?.title || 'Certificate of Attendance',
        body: template?.content?.bodyText || '',
        footer: template?.content?.footerText || '',
      };

  const hasScriptFont = existsSync(GREAT_VIBES);
  if (hasScriptFont) doc.registerFont('CITAD-Script', GREAT_VIBES);
  const scriptFont = hasScriptFont ? 'CITAD-Script' : 'Times-Italic';

  const recipientName = data.recipientName || certificate.recipientName || '';
  const nameY = mm(layout.recipientName?.y, 92);
  const nameX = mm(25, 25);
  const nameWidth = width - nameX * 2;
  const recipientSize = fitSingleLine(
    doc,
    recipientName,
    scriptFont,
    clamp(fonts.recipient?.size, 18, 52, 38),
    nameWidth,
    18
  );

  doc
    .font(scriptFont)
    .fontSize(recipientSize)
    .fillColor(fonts.recipient?.color || COLORS.text)
    .text(recipientName, nameX, nameY, {
      width: nameWidth,
      align: 'center',
      lineBreak: false,
    });

  const statement =
    cleanCertificateStatement(content.body, recipientName) ||
    `Has attended ${data.eventTitle || 'this event'}.`;
  const statementX = mm(30, 30);
  const statementWidth = width - statementX * 2;
  const statementY = mm(layout.body?.y, 122);
  let statementSize = clamp(fonts.body?.size, 10, 18, 14);

  doc.font('Times-Bold');
  while (
    statementSize > 9 &&
    doc.fontSize(statementSize).heightOfString(statement, {
      width: statementWidth,
      align: 'center',
    }) > mm(42, 42)
  ) {
    statementSize -= 0.5;
  }

  doc
    .font('Times-Bold')
    .fontSize(statementSize)
    .fillColor(fonts.body?.color || COLORS.text)
    .text(statement, statementX, statementY, {
      width: statementWidth,
      align: 'center',
    });

  if (qrDataURL) {
    const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');
    const qrSize = mm(layout.qrCode?.size, 16);
    const qrX =
      layout.qrCode?.x != null
        ? mm(layout.qrCode.x, 0)
        : width - qrSize - mm(12, 12);
    const qrY =
      layout.qrCode?.y != null
        ? mm(layout.qrCode.y, 0)
        : height - qrSize - mm(14, 14);

    doc
      .roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 2)
      .fill('#FFFFFF');
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc
      .font('Helvetica')
      .fontSize(5.2)
      .fillColor(COLORS.muted)
      .text('Scan to verify', qrX - 12, qrY + qrSize + 3, {
        width: qrSize + 24,
        align: 'center',
      });
  }

  const verificationBase =
    process.env.FRONTEND_URL || 'https://meetcitad.org';
  doc
    .font('Helvetica-Bold')
    .fontSize(6.6)
    .fillColor(COLORS.blueDeep)
    .text(`Certificate No: ${certificate.certificateNumber || ''}`, mm(12, 12), height - mm(18, 18), {
      width: width - mm(70, 70),
    });
  doc
    .font('Helvetica')
    .fontSize(6)
    .fillColor(COLORS.muted)
    .text(
      `Verify: ${verificationBase.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/verify`,
      mm(12, 12),
      height - mm(12, 12),
      { width: width - mm(70, 70) }
    );
}

export default renderInstitutionalCertificate;
