import { NextRequest, NextResponse } from 'next/server';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get all active support team groups
    const groups = await queryAsync(`
      SELECT 
        id,
        name,
        sort_order
      FROM support_team_groups 
      WHERE active = TRUE 
      ORDER BY sort_order ASC, name ASC
    `);

    // Get all active support teams
    const teams = await queryAsync(`
      SELECT 
        st.id,
        st.group_id,
        st.name,
        st.label,
        st.email,
        st.description,
        st.sort_order,
        stg.name as group_name
      FROM support_teams st
      JOIN support_team_groups stg ON st.group_id = stg.id
      WHERE st.active = TRUE AND stg.active = TRUE
      ORDER BY stg.sort_order ASC, st.sort_order ASC, st.name ASC
    `);

    // Format data for public portal (matches current supportTeamGroups structure)
    const supportTeamGroups: { [key: string]: any[] } = {};

    groups.forEach(group => {
      supportTeamGroups[group.name] = [];
    });

    teams.forEach(team => {
      if (supportTeamGroups[team.group_name]) {
        supportTeamGroups[team.group_name].push({
          value: team.id,
          label: team.label,
          team_id: team.group_id,
          email: team.email,
          description: team.description
        });
      }
    });

    return NextResponse.json(supportTeamGroups);

  } catch (error) {
    console.error('Error fetching support teams for public portal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}