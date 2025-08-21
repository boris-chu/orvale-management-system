import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

// Import category data
import { categories } from '@/config/categories/main-categories';
import { requestTypes } from '@/config/categories/request-types';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Transform categories into the format expected by the frontend
    const transformedCategories = Object.entries(categories).map(([key, name]) => ({
      id: key,
      name: name,
      subcategories: requestTypes[key as keyof typeof requestTypes]?.map(rt => ({
        id: rt.value,
        name: rt.text
      })) || []
    }));

    return NextResponse.json({
      success: true,
      categories: transformedCategories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}