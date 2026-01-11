
import { v4 as uuidv4 } from 'uuid';

/**
 * Simplified Ticket Data Factory (M4 - removed unused fields)
 */
export interface TicketData {
  subject: string;
  message: string;
}

export const createTicketData = (overrides: Partial<TicketData> = {}): TicketData => ({
  subject: `Test Ticket ${uuidv4().substring(0, 8)}`,
  message: `This is a synthesized test message generated at ${new Date().toISOString()}`,
  ...overrides,
});
