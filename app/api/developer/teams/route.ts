import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return mock teams data since we don't have a teams table yet
    // In production, this would query the actual teams table
    const teams = [
      { id: 'ITTS_Region7', name: 'ITTS: Region 7', section_id: 'ITD', section_name: 'IT Department' },
      { id: 'ITTS_Region1', name: 'ITTS: Region 1', section_id: 'ITD', section_name: 'IT Department' },
      { id: 'ITTS_Region2', name: 'ITTS: Region 2', section_id: 'ITD', section_name: 'IT Department' },
      { id: 'ITTS_Main', name: 'ITTS: Main Office', section_id: 'ITD', section_name: 'IT Department' },
      { id: 'NET_North', name: 'Network: North Zone', section_id: 'NET', section_name: 'Network Services' },
      { id: 'NET_South', name: 'Network: South Zone', section_id: 'NET', section_name: 'Network Services' },
      { id: 'DEV_Alpha', name: 'Dev Team Alpha', section_id: 'DEV', section_name: 'Development' },
      { id: 'DEV_Beta', name: 'Dev Team Beta', section_id: 'DEV', section_name: 'Development' },
      { id: 'SEC_Core', name: 'Security: Core', section_id: 'SEC', section_name: 'Security' },
      { id: 'ADMIN', name: 'Administration', section_id: 'ADMIN', section_name: 'Administration' }
    ];

    return NextResponse.json(teams);

  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}