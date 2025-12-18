/**
 * OFX (Open Financial Exchange) Parser
 *
 * Supports both SGML-based OFX 1.x and XML-based OFX 2.x formats.
 * Most banks export in OFX 1.x SGML format which doesn't use closing tags.
 *
 * All amounts are returned as strings for Decimal.js precision.
 */

import type { ParsedOFXFile, ParsedOFXTransaction, OFXTransactionType } from '../types';

// Account types from OFX
type OFXAccountType = 'CHECKING' | 'SAVINGS' | 'CREDITLINE' | 'MONEYMRKT' | 'CREDITCARD';

/**
 * Parse OFX date format (YYYYMMDDHHMMSS or YYYYMMDD) to ISO date string
 */
export function parseOFXDate(ofxDate: string): string {
  if (!ofxDate) return '';

  // Remove any timezone info like [0:GMT] or [-5:EST]
  const cleanDate = ofxDate.split('[')[0].trim();

  // Extract components
  const year = cleanDate.substring(0, 4);
  const month = cleanDate.substring(4, 6);
  const day = cleanDate.substring(6, 8);

  return `${year}-${month}-${day}`;
}

/**
 * Normalize transaction type from OFX to our type
 */
function normalizeTransactionType(type: string): OFXTransactionType {
  const typeMap: Record<string, OFXTransactionType> = {
    'CREDIT': 'CREDIT',
    'DEBIT': 'DEBIT',
    'INT': 'INT',
    'DIV': 'DIV',
    'FEE': 'FEE',
    'SRVCHG': 'SRVCHG',
    'DEP': 'DEP',
    'ATM': 'ATM',
    'POS': 'POS',
    'XFER': 'XFER',
    'CHECK': 'CHECK',
    'PAYMENT': 'PAYMENT',
    'CASH': 'CASH',
    'DIRECTDEP': 'DIRECTDEP',
    'DIRECTDEBIT': 'DIRECTDEBIT',
    'REPEATPMT': 'REPEATPMT',
  };
  return typeMap[type.toUpperCase()] || 'OTHER';
}

/**
 * Normalize account type from OFX to our type
 */
function normalizeAccountType(type: string): OFXAccountType {
  const typeMap: Record<string, OFXAccountType> = {
    'CHECKING': 'CHECKING',
    'SAVINGS': 'SAVINGS',
    'CREDITLINE': 'CREDITLINE',
    'MONEYMRKT': 'MONEYMRKT',
    'CREDITCARD': 'CREDITCARD',
  };
  return typeMap[type.toUpperCase()] || 'CHECKING';
}

/**
 * Extract value from OFX SGML tag
 * SGML format: <TAG>value (no closing tag)
 */
function extractSGMLValue(content: string, tag: string): string {
  // Match <TAG>value where value continues until next < or newline
  const regex = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Extract value from XML tag
 * XML format: <TAG>value</TAG>
 */
function extractXMLValue(content: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Extract value from either SGML or XML format
 */
function extractValue(content: string, tag: string, isXML: boolean): string {
  return isXML ? extractXMLValue(content, tag) : extractSGMLValue(content, tag);
}

/**
 * Extract a block of content between tags
 */
function extractBlock(content: string, tag: string): string {
  // Try to find opening and closing tags
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;

  const startIdx = content.indexOf(openTag);
  if (startIdx === -1) return '';

  const endIdx = content.indexOf(closeTag, startIdx);
  if (endIdx !== -1) {
    return content.substring(startIdx + openTag.length, endIdx);
  }

  // For SGML, find the next sibling tag at the same level
  // This is a simplified approach - find content until next major tag
  const afterOpen = content.substring(startIdx + openTag.length);
  return afterOpen;
}

/**
 * Extract all transaction blocks from BANKTRANLIST
 */
function extractTransactionBlocks(tranList: string): string[] {
  const transactions: string[] = [];
  const regex = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi;
  let match;

  while ((match = regex.exec(tranList)) !== null) {
    transactions.push(match[1]);
  }

  return transactions;
}

/**
 * Parse a single transaction block
 * Returns amounts as strings for Decimal.js precision
 */
function parseTransaction(block: string, isXML: boolean): ParsedOFXTransaction | null {
  const fitId = extractValue(block, 'FITID', isXML);
  const type = extractValue(block, 'TRNTYPE', isXML);
  const amount = extractValue(block, 'TRNAMT', isXML);
  const datePosted = extractValue(block, 'DTPOSTED', isXML);
  const name = extractValue(block, 'NAME', isXML);
  const memo = extractValue(block, 'MEMO', isXML);
  const checkNum = extractValue(block, 'CHECKNUM', isXML);

  // Must have at least fitId, amount, and date
  if (!fitId || !amount || !datePosted) {
    return null;
  }

  // Validate amount is a valid number
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    return null;
  }

  return {
    fitId,
    type: normalizeTransactionType(type),
    amount, // Keep as string for precision
    datePosted: parseOFXDate(datePosted),
    name: name || 'Unknown',
    memo: memo || undefined,
    checkNumber: checkNum || undefined,
  };
}

/**
 * Detect if content is XML-based OFX (2.x) or SGML-based OFX (1.x)
 */
function isXMLFormat(content: string): boolean {
  // XML OFX starts with <?xml or <?OFX
  return content.trimStart().startsWith('<?xml') || content.trimStart().startsWith('<?OFX');
}

/**
 * Mask account number for display (show last 4 digits)
 */
export function maskAccountId(accountId: string): string {
  if (accountId.length <= 4) return accountId;
  return '****' + accountId.slice(-4);
}

/**
 * Main OFX parser function
 */
export function parseOFX(content: string): ParsedOFXFile {
  const isXML = isXMLFormat(content);

  // Extract account info
  // Try BANKACCTFROM first (bank accounts), then CCACCTFROM (credit cards)
  let accountBlock = extractBlock(content, 'BANKACCTFROM');
  let isCreditCard = false;

  if (!accountBlock || !extractValue(accountBlock, 'ACCTID', isXML)) {
    accountBlock = extractBlock(content, 'CCACCTFROM');
    isCreditCard = true;
  }

  const bankId = extractValue(accountBlock, 'BANKID', isXML) || '';
  const accountId = extractValue(accountBlock, 'ACCTID', isXML);
  const accountTypeRaw = extractValue(accountBlock, 'ACCTTYPE', isXML);
  const accountType = isCreditCard ? 'CREDITCARD' : normalizeAccountType(accountTypeRaw);

  // Extract currency (defaults to USD if not specified)
  const stmtrs = extractBlock(content, 'STMTRS') || extractBlock(content, 'CCSTMTRS');
  const currency = extractValue(stmtrs || content, 'CURDEF', isXML) || 'USD';

  // Extract balance info
  const ledgerBal = extractBlock(content, 'LEDGERBAL');
  const balanceAmount = extractValue(ledgerBal, 'BALAMT', isXML);
  const balanceDate = extractValue(ledgerBal, 'DTASOF', isXML);

  // Extract transactions
  const tranList = extractBlock(content, 'BANKTRANLIST') || extractBlock(content, 'CCSTMTTRNRS');
  const transactionBlocks = extractTransactionBlocks(tranList || content);

  const transactions: ParsedOFXTransaction[] = [];
  let minDate = '';
  let maxDate = '';

  for (const block of transactionBlocks) {
    const tx = parseTransaction(block, isXML);
    if (tx) {
      transactions.push(tx);
      // Track date range
      if (!minDate || tx.datePosted < minDate) minDate = tx.datePosted;
      if (!maxDate || tx.datePosted > maxDate) maxDate = tx.datePosted;
    }
  }

  // Try to get date range from DTSTART/DTEND if available
  const dtStart = extractValue(tranList || content, 'DTSTART', isXML);
  const dtEnd = extractValue(tranList || content, 'DTEND', isXML);

  return {
    account: {
      bankId,
      accountId,
      accountType,
    },
    currency,
    transactions,
    balance: balanceAmount ? {
      amount: balanceAmount, // Keep as string for precision
      asOf: parseOFXDate(balanceDate),
    } : undefined,
    dateRange: {
      start: dtStart ? parseOFXDate(dtStart) : minDate,
      end: dtEnd ? parseOFXDate(dtEnd) : maxDate,
    },
  };
}

/**
 * Validate that an OFX file has required fields
 */
export function validateOFXFile(parsed: ParsedOFXFile): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!parsed.account.accountId) {
    errors.push('Missing account ID');
  }

  if (parsed.transactions.length === 0) {
    errors.push('No transactions found in file');
  }

  // Check for transactions with missing required fields
  const invalidTxCount = parsed.transactions.filter(
    tx => !tx.fitId || !tx.datePosted || !tx.amount
  ).length;

  if (invalidTxCount > 0) {
    errors.push(`${invalidTxCount} transaction(s) with missing required fields`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Read file and parse OFX content
 */
export async function parseOFXFile(file: File): Promise<ParsedOFXFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseOFX(content);
        const validation = validateOFXFile(parsed);

        if (!validation.valid) {
          reject(new Error(`Invalid OFX file: ${validation.errors.join(', ')}`));
          return;
        }

        resolve(parsed);
      } catch (error) {
        reject(new Error(`Failed to parse OFX file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
