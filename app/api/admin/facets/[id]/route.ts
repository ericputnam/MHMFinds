import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET - Get a single facet definition
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const facet = await prisma.facetDefinition.findUnique({
      where: { id },
    });

    if (!facet) {
      return NextResponse.json({ error: 'Facet definition not found' }, { status: 404 });
    }

    return NextResponse.json(facet);
  } catch (error) {
    console.error('Error fetching facet definition:', error);
    return NextResponse.json({ error: 'Failed to fetch facet definition' }, { status: 500 });
  }
}

// PATCH - Update a facet definition
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if facet exists
    const existing = await prisma.facetDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Facet definition not found' }, { status: 404 });
    }

    // If changing value, check for uniqueness
    if (body.value && body.value !== existing.value) {
      const duplicate = await prisma.facetDefinition.findUnique({
        where: {
          facetType_value: {
            facetType: existing.facetType,
            value: body.value,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Facet value "${body.value}" already exists for ${existing.facetType}` },
          { status: 400 }
        );
      }
    }

    const facet = await prisma.facetDefinition.update({
      where: { id },
      data: {
        ...(body.value && { value: body.value }),
        ...(body.displayName && { displayName: body.displayName }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(facet);
  } catch (error) {
    console.error('Error updating facet definition:', error);
    return NextResponse.json({ error: 'Failed to update facet definition' }, { status: 500 });
  }
}

// DELETE - Delete a facet definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the facet to check its type and value
    const facet = await prisma.facetDefinition.findUnique({
      where: { id },
    });

    if (!facet) {
      return NextResponse.json({ error: 'Facet definition not found' }, { status: 404 });
    }

    // Check if any mods use this facet value
    let modCount = 0;

    if (facet.facetType === 'contentType') {
      modCount = await prisma.mod.count({
        where: { contentType: facet.value },
      });
    } else if (facet.facetType === 'visualStyle') {
      modCount = await prisma.mod.count({
        where: { visualStyle: facet.value },
      });
    } else if (facet.facetType === 'themes') {
      modCount = await prisma.mod.count({
        where: { themes: { has: facet.value } },
      });
    } else if (facet.facetType === 'ageGroups') {
      modCount = await prisma.mod.count({
        where: { ageGroups: { has: facet.value } },
      });
    } else if (facet.facetType === 'genderOptions') {
      modCount = await prisma.mod.count({
        where: { genderOptions: { has: facet.value } },
      });
    } else if (facet.facetType === 'occultTypes') {
      modCount = await prisma.mod.count({
        where: { occultTypes: { has: facet.value } },
      });
    } else if (facet.facetType === 'packRequirements') {
      modCount = await prisma.mod.count({
        where: { packRequirements: { has: facet.value } },
      });
    }

    if (modCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete facet definition: ${modCount} mod(s) are using this value`,
          modCount,
        },
        { status: 400 }
      );
    }

    await prisma.facetDefinition.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting facet definition:', error);
    return NextResponse.json({ error: 'Failed to delete facet definition' }, { status: 500 });
  }
}
