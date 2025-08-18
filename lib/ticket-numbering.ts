import { queryAsync, runAsync } from './database';

// Team prefix mapping
const teamPrefixes: { [key: string]: string } = {
  // ITTS teams use "Region" naming
  'ITTS_Region7': 'R7',
  'ITTS_Region1': 'R1', 
  'ITTS_Region2': 'R2',
  'ITTS_Region3': 'R3',
  'ITTS_Region4': 'R4',
  'ITTS_Region5': 'R5',
  'ITTS_Region6': 'R6',
  'ITTS_Region8': 'R8',
  
  // Network teams might use "Zone" or "Area"
  'NET_North': 'NN',
  'NET_South': 'NS',
  'NET_Central': 'NC',
  'NET_East': 'NE',
  'NET_West': 'NW',
  
  // App Development teams might use "Squad" or "Team"
  'DEV_Alpha': 'DA',
  'DEV_Beta': 'DB',
  'DEV_Gamma': 'DG',
  'DEV_Delta': 'DD',
  
  // Security teams might use "Sector"
  'SEC_Core': 'SC',
  'SEC_Perimeter': 'SP',
  'SEC_Internal': 'SI',
  
  // Default fallback
  'DEFAULT': 'GX'
};

// Auto-generate prefix from team_id if not in mapping
const generateTeamPrefix = (teamId: string): string => {
  if (teamPrefixes[teamId]) {
    return teamPrefixes[teamId];
  }
  
  // Auto-generate prefix from team_id
  // ITTS_Region7 → R7
  // NET_North → NN  
  // DEV_Alpha → DA
  const parts = teamId.split('_');
  if (parts.length >= 2) {
    return parts[0].charAt(0) + parts[1].charAt(0);
  }
  return teamId.substring(0, 2).toUpperCase();
};

// Initialize ticket sequences table
export const initTicketSequences = async (): Promise<void> => {
  try {
    await runAsync(`
      CREATE TABLE IF NOT EXISTS ticket_sequences (
        team_id TEXT,
        date TEXT,
        last_sequence INTEGER DEFAULT 0,
        prefix TEXT,
        PRIMARY KEY (team_id, date)
      )
    `);
    console.log('✅ Ticket sequences table initialized');
  } catch (error) {
    console.error('❌ Error initializing ticket sequences table:', error);
    throw error;
  }
};

// Get next sequence number for a team on a specific date
const getNextSequenceForTeam = async (teamId: string, dateStr: string): Promise<number> => {
  const prefix = generateTeamPrefix(teamId);
  
  try {
    // Get current sequence for this team and date
    const existingRecord = await queryAsync(
      'SELECT last_sequence FROM ticket_sequences WHERE team_id = ? AND date = ?',
      [teamId, dateStr]
    );
    
    let nextSequence: number;
    
    if (existingRecord.length > 0) {
      // Increment existing sequence
      nextSequence = existingRecord[0].last_sequence + 1;
      await runAsync(
        'UPDATE ticket_sequences SET last_sequence = ? WHERE team_id = ? AND date = ?',
        [nextSequence, teamId, dateStr]
      );
    } else {
      // First ticket for this team on this date
      nextSequence = 1;
      await runAsync(
        'INSERT INTO ticket_sequences (team_id, date, last_sequence, prefix) VALUES (?, ?, ?, ?)',
        [teamId, dateStr, nextSequence, prefix]
      );
    }
    
    return nextSequence;
    
  } catch (error) {
    console.error('❌ Error getting next sequence:', error);
    // Fallback to timestamp-based sequence if database fails
    return Math.floor(Date.now() / 1000) % 999 + 1;
  }
};

// Generate ticket number based on team
export const generateTicketNumber = async (teamId: string): Promise<string> => {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD format
  
  const prefix = generateTeamPrefix(teamId);
  const sequence = await getNextSequenceForTeam(teamId, dateStr);
  
  return `${prefix}-${dateStr}-${sequence.toString().padStart(3, '0')}`;
};

// Get team prefix for display purposes
export const getTeamPrefix = (teamId: string): string => {
  return generateTeamPrefix(teamId);
};

// Update existing tickets with new numbering system
export const updateExistingTickets = async (): Promise<void> => {
  try {
    console.log('🔄 Updating existing tickets with new numbering system...');
    
    // Get all existing tickets
    const existingTickets = await queryAsync(
      'SELECT id, assigned_team, submitted_at FROM user_tickets ORDER BY submitted_at ASC'
    );
    
    console.log(`📊 Found ${existingTickets.length} existing tickets to update`);
    
    for (const ticket of existingTickets) {
      const teamId = ticket.assigned_team || 'ITTS_Region7';
      const submittedAt = new Date(ticket.submitted_at);
      const dateStr = submittedAt.toISOString().slice(2, 10).replace(/-/g, '');
      
      // Generate new ticket number for this team/date combination
      const prefix = generateTeamPrefix(teamId);
      const sequence = await getNextSequenceForTeam(teamId, dateStr);
      const newTicketNumber = `${prefix}-${dateStr}-${sequence.toString().padStart(3, '0')}`;
      
      // Update the ticket with new submission_id
      await runAsync(
        'UPDATE user_tickets SET submission_id = ? WHERE id = ?',
        [newTicketNumber, ticket.id]
      );
      
      console.log(`✅ Updated ticket ${ticket.id}: ${newTicketNumber}`);
    }
    
    console.log('🎉 All existing tickets updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating existing tickets:', error);
    throw error;
  }
};